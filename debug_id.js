
import { Database, CongraphDBAPI } from '@congraph-ai/congraphdb';
import fs from 'fs';
import path from 'path';

async function debug() {
    const dbPath = './data/debug-id.cgraph';
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    
    // Clean up old db if exists
    if (fs.existsSync(dbPath)) fs.unlinkSync(dbPath);
    if (fs.existsSync(dbPath + '.wal')) fs.unlinkSync(dbPath + '.wal');

    const db = new Database(dbPath);
    const conn = db.createConnection();
    
    await conn.query("CREATE NODE TABLE User (id STRING, name STRING, PRIMARY KEY (id))");
    
    const api = new CongraphDBAPI(db);
    const user = await api.createNode('User', { id: 'user1', name: 'Alice' });
    
    console.log('Created user:', JSON.stringify(user, null, 2));
    console.log('user._id type:', typeof user._id);
    console.log('user._id stringified:', String(user._id));
    
    try {
        console.log('Attempting to delete by user.id...');
        const deleted1 = await api.deleteNode(user.id);
        console.log('Deleted by id:', deleted1);
    } catch (e) {
        console.error('Failed to delete by id:', e.message);
    }

    // Re-create for second test
    const user2 = await api.createNode('User', { id: 'user2', name: 'Bob' });
    try {
        console.log('Attempting to delete by user._id...');
        const deleted2 = await api.deleteNode(user2._id);
        console.log('Deleted by _id:', deleted2);
    } catch (e) {
        console.error('Failed to delete by _id:', e.message);
    }

    await db.close();
}

debug().catch(console.error);
