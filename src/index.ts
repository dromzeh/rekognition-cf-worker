import { Hono } from 'hono'
import { validator } from 'hono/validator'
import { z } from 'zod'
import {
    RekognitionClient,
    DetectModerationLabelsCommand,
} from '@aws-sdk/client-rekognition'
import { bearerAuth } from 'hono/bearer-auth'

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

        try {
            const client = new RekognitionClient({
                // todo: base this off CF region
                region: 'us-west-2',
                credentials: {
                    accessKeyId: c.env.AWS_ACCESS_KEY_ID,
                    secretAccessKey: c.env.AWS_SECRET_ACCESS_KEY,
                },
            })

            const command = new DetectModerationLabelsCommand({
                Image: {
                    Bytes: u8,
                },
                MinConfidence: 60,
            })

            const moderationLabels = []

            const response = await client.send(command)

            if (
                response.ModerationLabels &&
                response.ModerationLabels.length > 0
            ) {
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

            return c.json({ moderationLabels })
        } catch (error) {
            console.error(error)
            return c.json({ error: 'Error calling API' }, 500)
        }
    },
)

app.get('/', (c) => {
    return c.json({ status: 'ok' })
})

export default app
