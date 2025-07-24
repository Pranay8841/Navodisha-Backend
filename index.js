import express from 'express';
import cors from 'cors';
import { MongoClient } from 'mongodb';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb+srv://pranaybhandekar8841:91uCwgf0QNxySBXW@cluster0.7pqdzji.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0';

let db;

// 🧠 Category Mapping
const categoryMap = {
  Open: ['GOPENS', 'GOPENO', 'GOPENH'],
  Ladies: ['LOPENS', 'LOPENO', 'LOPENH'],
  TFWS: ['TFWS'],
  EWS: ['EWS'],
  Orphan: ['ORPHAN'],
  Minority: ['MI'],
  OBC: ['GOBCS', 'LOBCS'],
  SEBC: ['GSEBCS', 'LSEBCS'],
  SC: ['GSCS', 'LSCS'],
  VJ: ['GVJS', 'LVJS'],
  NT1: ['GNT1S', 'LNT1S'],
  NT2: ['GNT2S', 'LNT2S'],
  NT3: ['GNT3S', 'LNT3S'],
  Defence: ['DEFOPENS', 'DEFOBCS', 'DEFSEBCS', 'DEFROBCS'],
  PWD: ['PWDOPENS']
};

const nursingCategoryMap = {
  SC: ['SC'],
  ST: ['ST'],
  'VJ-A': ['VJ-A'],
  'NT-B': ['NT-B'],
  'NT-C': ['NT-C'],
  'NT-D': ['NT-D'],
  OBC: ['OBC'],
  SEBC: ['SEBC'],
  EWS: ['EWS'],
  OPEN: ['OPEN'],
  D1: ['D1'],
  D2: ['D2'],
  ORPHEN: ['ORPHEN'],
  PH: ['PH']
};

// 🧠 Initialize MongoDB
async function initializeDatabase() {
  try {
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    db = client.db('college');
    console.log('✅ Connected to MongoDB');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err);
  }
}

// 🎯 Search API
app.get('/api/colleges', async (req, res) => {
  try {
    const { category, rank, percentile, cities, courseType, branch } = req.query;

    console.log('🔍 Search Parameters:', { category, rank, percentile, cities, courseType, branch });

    if (!courseType || !['engineering', 'pharmacy', 'nursing'].includes(courseType)) {
      return res.status(400).json({ error: 'Invalid or missing courseType' });
    }

    let collectionName = 'college_list';
    if (courseType === 'pharmacy') collectionName = 'college_list_pharma';
    if (courseType === 'nursing') collectionName = 'college_list_nursing';

    const collection = db.collection(collectionName);

    let technicalCategories = [];

    if (Array.isArray(category)) {
      technicalCategories = category;
    } else {
      if (courseType === 'nursing') {
        technicalCategories = nursingCategoryMap[category] || [];
      } else {
        technicalCategories = categoryMap[category] || [];
      }
    }

    if (!rank && !percentile) {
      return res.status(400).json({ error: 'Rank or Percentile is required' });
    }

    const query = {
      category: { $in: technicalCategories }
    };

    if (cities) {
      const cityList = Array.isArray(cities) ? cities : [cities];
      query.college = {
        $regex: `(${cityList.map(c => c.trim()).join('|')})$`,
        $options: 'i'
      };
    }

    if (branch) {
      const escapeRegex = str => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const branchList = Array.isArray(branch) ? branch : [branch];
      query.branch = { $in: branchList.map(c => new RegExp(`^${escapeRegex(c.trim())}$`, 'i')) };
    }

    let sortField = {};

    if (rank) {
      const parsedRank = parseInt(rank);
      if (isNaN(parsedRank)) {
        return res.status(400).json({ error: 'Invalid rank format' });
      }
      if (courseType === 'nursing') {
        query.rank = { $gte: parsedRank };
        sortField = { rank: 1 };
      } else {
        query.merit = { $gte: parsedRank };
        sortField = { merit: 1 };
      }
    } else if (percentile) {
      const parsedPercentile = parseFloat(percentile);
      if (isNaN(parsedPercentile)) {
        return res.status(400).json({ error: 'Invalid percentile format' });
      }
      query.percentile = { $lte: parsedPercentile };
      sortField = { percentile: -1 };
    }

    // console.log('📦 Querying Collection:', collectionName);
    console.log('🔍 Final MongoDB Query:', query);

    const results = await collection
      .find(query)
      .sort(sortField)
      .limit(40)
      .toArray();

    res.json(results);
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// ✅ Health Check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

initializeDatabase();
