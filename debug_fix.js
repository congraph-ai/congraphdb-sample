
import { Database, CongraphDBAPI } from '@congraph-ai/congraphdb';
import fs from 'fs';
import path from 'path';

async function debug() {
    const dbPath = './data/debug-fix.cgraph';
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    // Clean up old db if exists
    if (fs.existsSync(dbPath)) {
        try { fs.unlinkSync(dbPath); } catch(e) {}
    }
    if (fs.existsSync(dbPath + '.wal')) {
        try { fs.unlinkSync(dbPath + '.wal'); } catch(e) {}
    }

    const db = new Database(dbPath);
    const conn = db.createConnection();
    
    await conn.query("CREATE NODE TABLE User (id STRING, name STRING, PRIMARY KEY (id))");
    
    console.log('Created User table');
    
    const api = new CongraphDBAPI(db);
    const u4 = await api.createNode('User', { id: 'user4', name: 'Diana' });
    
    console.log('u4._id:', u4._id, 'u4.id:', u4.id);
    
    try {
        const query = `MATCH (n) WHERE n._id = '${u4._id}' OR n.id = '${u4._id}' DETACH DELETE n`;
        console.log('Executing fix query:', query);
        const result = await conn.query(query);
        await result.getAll();
        console.log('Fix query worked!');
    } catch (e) {
        console.error('Fix query failed:', e.message);
    }

    await db.close();
}

debug().catch(console.error);
