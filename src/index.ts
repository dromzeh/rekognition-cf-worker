import { Hono } from 'hono'
import { validator } from 'hono/validator'
import { z } from 'zod'
import {
    RekognitionClient,
    DetectModerationLabelsCommand,
    type DetectModerationLabelsCommandOutput,
} from '@aws-sdk/client-rekognition'
import { bearerAuth } from 'hono/bearer-auth'
import { Context } from 'hono'

type Bindings = {
    AWS_ACCESS_KEY_ID: string
    AWS_SECRET_ACCESS_KEY: string
    BEARER_TOKEN: string
}

const app = new Hono<{ Bindings: Bindings }>()

const schema = z.object({
    file: z.any(),
})

app.use('*', async (c, next) => {
    const auth = bearerAuth({
        token: c.env.BEARER_TOKEN,
    })
    return auth(c, next)
})

const createRekognitionClient = (c: Context) => {
    return new RekognitionClient({
        region: 'us-west-2',
        credentials: {
            accessKeyId: c.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: c.env.AWS_SECRET_ACCESS_KEY,
        },
    })
}

const extractModerationLabels = (
    response: DetectModerationLabelsCommandOutput,
) => {
    const moderationLabels = []
    if (response.ModerationLabels && response.ModerationLabels.length > 0) {
        const labels = []
        for (const label of response.ModerationLabels) {
            labels.push({
                name: label.Name,
                confidence: label.Confidence,
            })
        }

        if (labels.length > 0) {
            moderationLabels.push({
                labels: labels,
            })
        }
    }
    return moderationLabels
}

app.post(
    '/moderate',
    validator('form', (value, c) => {
        const parsed = schema.safeParse(value)
        console.log(parsed)
        if (!parsed.success) {
            console.log(parsed.error)
            return c.text('Invalid data', 401)
        }
        return parsed.data
    }),
    async (c) => {
        const { file } = c.req.valid('form') as { file: File }

        const u8 = await file.arrayBuffer().then((buffer) => {
            return new Uint8Array(buffer)
        })

        const client = createRekognitionClient(c)

        const command = new DetectModerationLabelsCommand({
            Image: {
                Bytes: u8,
            },
            MinConfidence: 60,
        })

        const response = await client.send(command)

        const moderationLabels = extractModerationLabels(response)

        return c.json({ moderationLabels })
    },
)

app.get('/', (c) => {
    return c.json({ status: 'ok' })
})

app.onError((err, c) => {
    console.error(err)
    return c.json({ error: 'Internal Server Error' }, 500)
})

export default app
