const HTTP = require('http')
const { $fetch, encrypt, decrypt, $query } = require('./tool')
const PORT = 1954

const domain = $remote ? 'https://wcraft.canskit.com' : 'https://canskit.wcraft.cn' // Antoher Lisp Version: https://wcraft.celwk.com
HTTP.createServer(async (req, res) => {
    const { headers, url, method } = req

    res.writeHead(200, { 'Content-Type': 'application/json' })

    const [fn, ...params] = url.split('/').filter(x => x).splice(1).map(x => decodeURIComponent(x).underline())

    // For testing, login a random member
    if (fn === 'login') {
        const ip = headers['x-real-ip'], 
              location = 'Get From Cloud Server by IP',
              userAgent = headers['user-agent']
              
        const { mmid, name, ssid } = await $query(sql`SELECT * FROM test.login("ip" => $1, "location" => $2, "user_agent" => $3)`, [ip, location, userAgent])

        const passport = encrypt(mmid.toString())
        
        const data = {
            state: ':ok',
            mmid, name, domain, 
            passport, 
            ssid: encrypt(ssid.toString()),
            avatar: `/src/${mmid %7 + 1}.jpg`,  // For Testing
        }
        return res.end(JSON.stringify(data))
    }
    if (!headers.passport) {
        res.writeHead(401, { 'Content-Type': 'text/plain' })
        return res.end('Who Are You?');
    }

    if (fn === 'logging.leave') {
        const ssid = Number.parseInt(decrypt(headers.ssid))
        return $query(sql`CALL logging.come_out("ssid" => $1)`, [ssid])
    }

    const from = Number.parseInt(decrypt(headers.passport))
    const values = [from] 
    const args = [`"from" => $1`]
    const data = []
    switch (method) {
        case 'GET':
            for (let i = 0; i < params.length; i += 2) {
                data.push([params[i], params[i + 1]])
            }
            break
        default:    // Including POST/DELETE/PUT
            data.push(...Object.entries(await $fetch(req)))
            break
    }
    for (let i = 0; i < data.length; i++) {
        const [key, value] = data[i]
        args.push(`"${key.underline()}" => $${i + 2}`)
        values.push(value)
    }

    const code = sql`SELECT jsonb::text FROM ${fn}(${args.join(', ')}) as jsonb`;
    console.log({ fn, values, code })
    const { jsonb, ...error } = await $query(code, values);
    if (!jsonb) {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify(error) );
    } else {
        res.end(jsonb);
    }
}).listen(PORT);

console.log(`Server running at ${domain}`);