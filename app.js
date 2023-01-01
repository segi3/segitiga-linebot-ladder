require('dotenv').config()
const config = {
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    channelSecret: process.env.LINE_CHANNEL_SECRET
}

let cache = {}
const Redis = require("ioredis")
const { REDIS_URL } = process.env
const renderRedis = new Redis(REDIS_URL)

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

    try {
        if (event.message.text.toLowerCase().includes('/ladder')) {
            const groupId = event.source.groupId
            const raw = event.message.text
            const filtered = raw.trim().replace(/\n/g, ' ')
    
            const opsiRegex = /(?<=[|]).+?(?=[\|@])/g
            const orangRegex = /(?<=@).+?(?=@|$)/g
    
            const opsiArr = filtered.match(opsiRegex).map(s => s.trim())
            const orangArr = filtered.match(orangRegex).map(s => s.trim())
    
            let txtReply = ''
    
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
                txtReply = txtReply + `- ${opsiArr[i]} > ${shuffled[i]}`
                if (i+1 != opsiArr.length) {
                    txtReply+=`\n`
                }
            }
    
            const replyObj = {
                type: 'text',
                text: txtReply
            }
    
            let toSaveToCache = {
                opsiArr,
                orangArr
            }

            // cache[groupId] = toSaveToCache
            console.log(`saved ${groupId} to cache, rn ${cache}`)
            // console.log(cache)

            renderRedis.set(groupId, JSON.stringify(toSaveToCache), 'EX', 900) // set to expire in 15 minutes
    
            return client.replyMessage(event.replyToken, replyObj)
    
        } else if (event.message.text.toLowerCase().includes('/reshuffle')) {
            const groupId = event.source.groupId
            let txtReply = ''

            /* cache using json */
            // console.log(`searching for ${groupId} in ${cache}`)
            // console.log(cache)
            // if (cache[groupId] === undefined || cache[groupId] === null) {
            //     txtReply = 'Gak bisa reshuffle, belum ada data ladder :('
            //     return client.replyMessage(event.replyToken, {
            //         type: 'text',
            //         text: txtReply
            //     })
            // }
            // const opsiArr = cache[groupId].opsiArr
            // const orangArr = cache[groupId].orangArr

            /* cache using redis */
            let cached = renderRedis.get(groupId)
            if (cached === null) {
                txtReply = 'Gak bisa reshuffle, belum ada data ladder :('
                return client.replyMessage(event.replyToken, {
                    type: 'text',
                    text: txtReply
                })
            }
            cached = JSON.parse(cached)
            const { opsiArr, orangArr } = cached
    
            let shuffled = orangArr
                .map(value => ({
                    value,
                    sort: Math.random()
                }))
                .sort((a, b) => a.sort - b.sort)
                .map(({
                    value
                }) => value)
    
            txtReply = 'Hasil Ladder\n'
            for (let i = 0; i < opsiArr.length; i++) {
                txtReply = txtReply + `- ${opsiArr[i]} > ${shuffled[i]}`
                if (i+1 != opsiArr.length) {
                    txtReply+=`\n`
                }
            }
    
            const replyObj = {
                type: 'text',
                text: txtReply
            }
    
            return client.replyMessage(event.replyToken, replyObj)
    
        } else if (event.message.text.toLowerCase().includes('/bangun')) {
            return client.replyMessage(event.replyToken, {
                type: 'text',
                text: 'siap udah bangun'
            })
        } else if (event.message.text.toLowerCase().includes('/dbcache')) {
            console.log(cache)
        } else if (event.message.text.toLowerCase().includes('/groupid')) {
            console.log(`groupId => ${event.source.groupId}`)
            return client.replyMessage(event.replyToken, {
                type: 'text',
                text: event.source.groupId
            })
        }
    } catch (e) {
        console.log(e)
        return client.replyMessage(event.replyToken, {
            type: 'text',
            text: 'command gak bisa di proses, ada error di app :('
        })
    }
}

app.listen(process.env.PORT)