
import { Database, CongraphDBAPI } from '@congraph-ai/congraphdb';
import fs from 'fs';
import path from 'path';

async function debug() {
    const dbPath = './data/debug-id-3.cgraph';
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
    await conn.query("CREATE REL TABLE FOLLOWS (FROM User TO User)");
    
    const api = new CongraphDBAPI(db);
    const u1 = await api.createNode('User', { id: 'user1', name: 'Alice' });
    const u2 = await api.createNode('User', { id: 'user2', name: 'Bob' });
    const u3 = await api.createNode('User', { id: 'user3', name: 'Charlie' });
    const u4 = await api.createNode('User', { id: 'user4', name: 'Diana' });
    
    console.log('Created 4 users');
    
    await api.createEdge(u1._id, 'FOLLOWS', u4._id);
    
    console.log('Created relationship: Alice -> Diana');
    
    try {
        console.log(`Attempting to delete Diana by u4.id ('${u4.id}') with detach=true...`);
        const deleted = await api.deleteNode(u4.id, true);
        console.log('Deleted by id:', deleted);
    } catch (e) {
        console.error('Failed to delete by id:', e.message);
    }

    try {
        console.log(`Attempting to delete Charlie by u3._id ('${u3._id}') with detach=true...`);
        const deleted = await api.deleteNode(u3._id, true);
        console.log('Deleted by _id:', deleted);
    } catch (e) {
        console.error('Failed to delete by _id:', e.message);
    }

    await db.close();
}

debug().catch(console.error);
