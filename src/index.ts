import { Hono } from 'hono'
import { validator } from 'hono/validator'
import { z } from 'zod'
import { DetectModerationLabelsCommand } from '@aws-sdk/client-rekognition'
import {
    createRekognitionClient,
    extractModerationLabels,
} from './lib/rekognition-client'

type Bindings = {
    AWS_ACCESS_KEY_ID: string
    AWS_SECRET_ACCESS_KEY: string
    BEARER_TOKEN: string
}

const schema = z.object({
    file: z.any(),
})

const app = new Hono<{ Bindings: Bindings }>()

app.post(
    '/labels',
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
        const token = c.req.header('Authorization')

        if (!token) {
            return c.text('Unauthorized', 401)
        } else if (token !== `Bearer ${c.env.BEARER_TOKEN}`) {
            return c.text('Unauthorized', 401)
        }

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
    const routes = app.routes
    return c.json({ status: 'ok', routes: routes })
})

app.onError((err, c) => {
    console.error(err)
    return c.json({ error: 'Internal Server Error' }, 500)
})

export default app
