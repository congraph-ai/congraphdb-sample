
import { Database, CongraphDBAPI } from '@congraph-ai/congraphdb';
import fs from 'fs';
import path from 'path';

async function debug() {
    const dbPath = './data/debug-id-4.cgraph';
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
    
    await conn.query("CREATE NODE TABLE User (id STRING, name STRING, active BOOLEAN, PRIMARY KEY (id))");
    
    const api = new CongraphDBAPI(db);
    const u = await api.createNode('User', { id: 'u1', name: 'Alice', active: true });
    
    console.log('Created user:', JSON.stringify(u, null, 2));
    
    console.log('Updating user (active to false) using internal _id:', u._id);
    const updated = await api.updateNode(u._id, { active: false });
    
    console.log('Updated user:', JSON.stringify(updated, null, 2));
    
    if (updated.name === undefined) {
        console.error('ERROR: Property "name" was lost after update!');
    } else {
        console.log('SUCCESS: Property "name" was preserved.');
    }

    await db.close();
}

debug().catch(console.error);
