
import { Database } from '@congraph-ai/congraphdb';
import fs from 'fs';
import path from 'path';

async function debug() {
    const dbPath = './data/debug-raw.cgraph';
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    if (fs.existsSync(dbPath)) try { fs.unlinkSync(dbPath); } catch(e) {}
    if (fs.existsSync(dbPath + '.wal')) try { fs.unlinkSync(dbPath + '.wal'); } catch(e) {}

    const db = new Database(dbPath);
    const conn = db.createConnection();
    
    await conn.query("CREATE NODE TABLE User (id STRING, name STRING, active BOOLEAN, PRIMARY KEY (id))");
    await conn.query("CREATE (:User {id: 'u1', name: 'Alice', active: true})");
    
    // Test 1: basic MATCH RETURN
    console.log('\n--- Test 1: MATCH (n:User) RETURN n ---');
    const r1 = await conn.query("MATCH (n:User) RETURN n");
    const rows1 = await r1.getAll();
    console.log('rows:', JSON.stringify(rows1, null, 2));
    
    // Test 2: MATCH without label, RETURN n
    console.log('\n--- Test 2: MATCH (n) RETURN n ---');
    const r2 = await conn.query("MATCH (n) RETURN n");
    const rows2 = await r2.getAll();
    console.log('rows:', JSON.stringify(rows2, null, 2));

    // Test 3: MATCH with WHERE n._id = '0'
    console.log('\n--- Test 3: MATCH (n) WHERE n._id = \'0\' RETURN n ---');
    const r3 = await conn.query("MATCH (n) WHERE n._id = '0' RETURN n");
    const rows3 = await r3.getAll();
    console.log('rows:', JSON.stringify(rows3, null, 2));
    
    // Test 4: MATCH with WHERE n.id  
    console.log('\n--- Test 4: MATCH (n) WHERE n.id = \'u1\' RETURN n ---');
    const r4 = await conn.query("MATCH (n) WHERE n.id = 'u1' RETURN n");
    const rows4 = await r4.getAll();
    console.log('rows:', JSON.stringify(rows4, null, 2));

    // Test 5: SET with user id
    console.log('\n--- Test 5: MATCH (n) WHERE n.id = \'u1\' SET n.active = false RETURN n ---');
    const r5 = await conn.query("MATCH (n) WHERE n.id = 'u1' SET n.active = false RETURN n");
    const rows5 = await r5.getAll();
    console.log('rows:', JSON.stringify(rows5, null, 2));

    // Test 6: SET with _id
    console.log('\n--- Test 6: MATCH (n) WHERE n._id = \'0\' SET n.name = \'Bob\' RETURN n ---');
    const r6 = await conn.query("MATCH (n) WHERE n._id = '0' SET n.name = 'Bob' RETURN n");
    const rows6 = await r6.getAll();
    console.log('rows:', JSON.stringify(rows6, null, 2));

    await db.close();
}

debug().catch(console.error);
