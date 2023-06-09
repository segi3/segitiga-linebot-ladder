let cache = {}

const ladderHandler = async (event, client, renderRedis) => {
    // text message event
    if (event.message.text.toLowerCase().includes('/ladder')) {
        const groupId = event.source.groupId ? event.source.groupId : event.source.roomId
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

        let shuffled = orangArr
            .map(value => ({
                value,
                sort: Math.random()
            }))
            .sort((a, b) => a.sort - b.sort)
            .map(({
                value
            }) => value)

        txtReply = '*Hasil Ladder*\n'
        let reShuffleMsg = '\nDalam 15 menit, hasil ladder bisa di reshuffle pakek `/reshuffle`'
        for (let i = 0; i < opsiArr.length; i++) {
            txtReply = txtReply + `- ${opsiArr[i]} > ${shuffled[i]}\n`
        }

        const replyObj = {
            type: 'text',
            text: txtReply + reShuffleMsg
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
        const groupId = event.source.groupId ? event.source.groupId : event.source.roomId
        let txtReply = ''

        /* cache using json */
        console.log(`searching for ${groupId} in ${cache}`)
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
        let cached = await renderRedis.get(groupId)
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

        txtReply = '*Reshuffle Ladder*\n'
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
    }
}

module.exports = { ladderHandler }