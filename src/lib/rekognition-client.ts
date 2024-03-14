import { Context } from 'hono'
import {
    RekognitionClient,
    DetectModerationLabelsCommandOutput,
} from '@aws-sdk/client-rekognition'

export type Bindings = {
    AWS_ACCESS_KEY_ID: string
    AWS_SECRET_ACCESS_KEY: string
    BEARER_TOKEN: string
}

export const createRekognitionClient = (c: Context<{ Bindings: Bindings }>) => {
    return new RekognitionClient({
        // todo: dependant on cf colo
        region: 'us-west-2',
        credentials: {
            accessKeyId: c.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: c.env.AWS_SECRET_ACCESS_KEY,
        },
    })
}

export const extractModerationLabels = (
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
