const request = require('request-promise')
const fs = require('fs')
const im = require('imagemagick');
const promisify = require('util').promisify

const convert = (params) => {
    return new Promise( (fulfill,reject) => {
        im.convert(params, (err,res) => {
            if(err)
                reject(err)
            else
                fulfill(res)
        })
    })
}

const quickCopy = (fn, fnCopy) => {
    return new Promise( (fulfill, reject) => {
        var p = fs.createReadStream(fn).pipe(fs.createWriteStream(fnCopy))
        p.on('end', () => fulfill())
        p.on('finish', () => fulfill())
        p.on('error', () => reject())
    })
}

const main = async (fn, encdata) => {
    try {
        let imgResults = await tagImage(encdata)
        //imgResults = JSON.parse(imgResults)
        const fnCopy = `${fn.split('.')[0]}-0.${fn.split('.')[1]}`
        try {
            await quickCopy(fn,fnCopy)
        } catch (error) {
            throw error
        }
        imgResults.responses[0].textAnnotations.forEach( async (x,i) => {
            console.log(`writing item-${i}`)
            try {
                var op = await convert([`${fn.split('.')[0]}-${i}.${fn.split('.')[1]}`,
                    '-fill','black',
                    '-box','#ffffffff',
                    '-pointsize','12',
                    '-gravity','SOUTH',
                    '-annotate',`+${x.boundingPoly.vertices[0].x}+${x.boundingPoly.vertices[0].y}`,
                    x.description,
                    `${fn.split('.')[0]}-${i+1}.${fn.split('.')[1]}`
                ])
                console.log(op)
            } catch (error) {
                throw error
            }
        })
    } catch (error) {
        console.log(error.message)
    }
}

const tagImage = async (encdata) => {
    var options = {
        method: 'POST',
        url: 'https://vision.googleapis.com/v1p1beta1/images:annotate',
        qs: { key: process.env.GPC_KEY },
        headers:
            {
                'Content-Type': 'application/json'
            },
        body:
            {
                requests:
                    [{
                        image: { content: encdata },
                        features:
                            [{
                                type: 'DOCUMENT_TEXT_DETECTION',
                                maxResults: 3,
                                model: 'builtin/latest'
                            }]
                    }]
            },
        json: true
    };

    return request(options)
}
/* Start */
const fn = process.argv[2]
try {
    let buff = fs.readFileSync(fn)
    let enc = buff.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
    
    console.log('processing', fn)
    main(fn,enc)
} catch (error) {
    console.log(error.message)
} 



