require('dotenv').config()
const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
}

const app = require('express')()
const line = require('@line/bot-sdk')

app.get('/', function (req, res) {
    res.status(200).send('Chatbot Tutorial')
})

app.post('/webhook', line.middleware(config), (req, res) => {
    Promise
        .all(req.body.events.map(handleEvent))
        .then((result) => res.json(result))
        .catch((err) => {
            console.error(err)
            console.error(err.originalError.response.data)
            console.error(err.response.data)
            res.status(500).end()
        })
})

const client = new line.Client(config)
const handleEvent = (event) => {
    if (event.type !== 'message' || event.message.type !== 'text') {
        return Promise.resolve(null)
    }

    if (event.message.text.toLowerCase().includes('/ladder')) {
        let txtReply = ''
        const raw = event.message.text
        const filtered = raw.trim().replace(/\n/g, ' ')

        const opsiRegex = /(?<=[|]).+?(?=[\|@])/g
        const orangRegex = /(?<=@).+?(?=@|$)/g

        const opsiArr = filtered.match(opsiRegex).map(s => s.trim())
        const orangArr = filtered.match(orangRegex).map(s => s.trim())

        if (opsiArr.length != orangArr.length) {
            txtReply = 'Jumlah opsi sama orangnya gak sama'
            return client.replyMessage(event.replyToken, {
                type: 'text',
                text: txtReply
            })
        }

        txtReply = 'Opsi\n'
        for (let op in opsiArr) {
            txtReply = txtReply + `- ${opsiArr[op]}\n`
        }
        txtReply = txtReply + 'Orang\n'
        for (let or in orangArr) {
            txtReply = txtReply + `- ${orangArr[or]}\n`
        }

        let shuffled = orangArr
            .map(value => ({
                value,
                sort: Math.random()
            }))
            .sort((a, b) => a.sort - b.sort)
            .map(({
                value
            }) => value)

        txtReply = txtReply + 'Hasil Ladder\n'
        for (let i = 0; i < opsiArr.length; i++) {
            txtReply = txtReply + `- ${opsiArr[i]} > ${shuffled[i]}\n`
        }

        // console.log(txtReply)

        const replyObj = {
            type: 'text',
            text: txtReply
        }

        return client.replyMessage(event.replyToken, replyObj)
    }

}

app.listen(process.env.PORT)