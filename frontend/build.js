import fs from 'fs'

function readVersion() {
    try {
        const version = fs.readFileSync('../backend/data/version.json', 'utf8')
        return JSON.parse(version)
    } catch (error) {
        return {
            version: 1
        }
    }
}

function writeVersion(version) {
    fs.writeFileSync('../backend/data/version.json', JSON.stringify({ version }, null, 2))
}

const version = readVersion()
version.version++
writeVersion(version.version)
