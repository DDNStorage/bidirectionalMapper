const fs = require('fs')

const PORT = 9519 // HTTP port

// The main HTML page
const HTML_PAGE = fs.readFileSync('./index.html').toString()

// Require the framework and instantiate it
const fastify = require('fastify')({ logger: true })

const db_options = {} // No options are required by default
const db = require('better-sqlite3')('./data/sample.sqlite3', db_options)

/**
 * Create database ID
 * Changing this may require updating the db table definition
 */
function genId() {
    return Math.round(new Date().getTime()/1000)
}

/**
 * Root route
 */
fastify.get('/', async (request, reply) => {
  reply.code(200).type('text/html').send(HTML_PAGE)
})

/**
 * Get all the values for the specified Bin
 */
 fastify.get('/get/table/:bin', async (request, reply) => {
    const sql = `SELECT * FROM ${request.params.bin};`
    const rows = db.prepare(sql).all()
    if (rows) {
        reply.send(rows) // Send as JSON
    } else { // No results, so return 404 File not Found
        reply.code(404)
        return(`${request.params.bin}/${request.params.id}: Not found`)
    }
})

/**
 * Get all the link data
 */
 fastify.get('/get/links', async (request, reply) => {
    const sql = `SELECT * FROM linkview`
    return(db.prepare(sql).all())
})

/**
 * Get the ID for the specified Bin and specified value
 */
 fastify.get('/find/:bin/:val', async (request, reply) => {
    const row = await db.prepare(`SELECT id FROM ${request.params.bin} WHERE name= ?`).get(request.params.val)
    if (row && row.id) {
        return(row.id)
    } else { // No results, so return 404 File not Found
        reply.code(404).send(`couldn't find ${request.params.bin}:${request.params.val}`)
    }
})

/**
 * Get all values for the specified Bin
 * TODO: Capture invalid Bin
 */
 fastify.get('/get/bin/:bin', async (request, reply) => {
    const row = db.prepare(`SELECT * FROM ${request.params.bin}`).all()
    return(row)
})

/**
 * Get the row matching the specified Bin and ID
 */
 fastify.get('/get/bin/:bin/:id', async (request, reply) => {
    const row = db.prepare(`SELECT * FROM ${request.params.bin} WHERE id=?`).get(request.params.id)
    return(row)
})

/**
 * Add a new record with Bin and Value
 * Returns: new record's ID
 */
 fastify.get('/add/bin/:bin/:val', async (request, reply) => {
    const newId = genId()
    const row = db.prepare(`INSERT INTO ${request.params.bin} (id, name) VALUES (?,?)`).run(newId, request.params.val)
    if (row.changes == 1) {
        return({ result: 'success', ID: newId })
    } else {
        reply.code(500)
        return(`Invalid insert: Added ${row.changes} row(s); expected '1'`)
    }
})

/**
 * Add a link between two records - by IDs
 * TOOD: Add check to verify both IDs exist
 */
 fastify.get('/add/link/:id1/:id2', async (request, reply) => {
    try {
        const row = db.prepare(`INSERT INTO links (a,b) VALUES (?,?)`).run(request.params.id1, request.params.id2)
        if (row.changes == 1) {
            return({ result: 'success' })
        } else {
            reply.code(500)
            return({ result: 'failure', msg: `Invalid response: Linked ${row.changes} row(s); expected '1'` })
        }
    } catch (err) {
        console.error(`ERR: ${err}`)
        reply.code(500)
        return({ result: 'error', msg: err.message }) 
    }
})

/**
 * Remove a db record by Bin and ID
 * TODO: Add check for valid Bin/ID combination
 */
 fastify.get('/remove/bin/:bin/:id', async (request, reply) => {
    const newId = genId()
    const row1 = db.prepare(`DELETE FROM links WHERE ${request.params.bin.toLowerCase()}= ?`).run(request.params.id)
    const row2 = db.prepare(`DELETE FROM ${request.params.bin.toLowerCase()} WHERE id= ?`).run(request.params.id)
    if (row2.changes == 1) {
        return({ result: `success` })
    } else {
        reply.code(500)
        return({ result: 'error', msg: `Invalid insert: Added ${row2.changes} row(s); expected '1'` })
    }
})

/**
 * Remove a link by IDs
 */
 fastify.get('/remove/link/:id1/:id2', async (request, reply) => {
    const newId = genId()
    const row = db.prepare(`DELETE FROM links WHERE a= ? and b= ?`).run(request.params.id1, request.params.id2)
    if (row.changes == 1) {
        return({ result: `success` })
    } else {
        reply.code(500)
        return({ result: 'error', msg: `Invalid delete: removed ${row.changes} row(s); expected '1'` })
    }
})

/**
 * Update the value of a record by Bin and ID
 */
 fastify.get('/replace/:bin/:id/:newval', async (request, reply) => {
    const newId = genId()
    const row = db.prepare(`UPDATE ${request.params.bin} SET name= ? WHERE id= ?`).run(request.params.newval, request.params.id)
    if (row.changes == 1) {
        return({ result: `success` })
    } else {
        reply.code(500)
        return({ result: 'error', msg: `Invalid insert: Added ${row.changes} row(s); expected '1'` })
    }
})

/**
 * Run the server
 */
 const start = async () => {
  try {
    await fastify.listen(PORT || 8000)
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
