const express = require('express');
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require('dotenv').config();

const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri);


app.get('/', (req, res) => {
    res.send('Hello World!')
});

const run = async () => {
    try {
        const database = client.db("BES3D");
        const templateCollection = database.collection("templates");

        // Query for getting a specific template
        app.get("/api/template", async (req, res) => {
            const templateName = req.query.templateName;
            const cursor = await templateCollection.findOne({ templateName: templateName });
            if(cursor) {
                res.status(200).send(cursor);
            }
            else {
                res.status(404).send("No data found!");
            }
        });

        // Query for getting user data
        app.post('/api/tableData', async (req, res) => {
            const target = req.body.target;
            const action = req.body.action;
            if(action === 'search') {
                const parameters = req.body.parameters;
                const searchWay = req.body.searchWay;
                const columnOrder = req.body.columnOrder;
                const page = req.body.page;
                const limit = req.body.maxRow;

                const project = {};

                columnOrder.forEach(element => {
                    project[element] = 1;
                });
                console.log(project);

                console.log(searchWay);
                const match = {};
                if(searchWay.condition === 'or' || searchWay.condition === 'and') {
                    const matchFields = [];
                    searchWay.fields.forEach(({key, dataType, operator}) => {
                        if(parameters[key]) {
                            if(dataType === 'string') {
                                if(operator === "match") {
                                    matchFields.push({[key]: { $regex: parameters[key], $options: 'i' }})
                                } else if(operator === "equal") {
                                    matchFields.push({[key]: parameters[key]});
                                }
                            }
                            else if(dataType === 'number') {
                                if(operator === "equal") {
                                    matchFields.push({[key]: parameters[key]});
                                } else if(operator === "greaterThan") {
                                    matchFields.push({[key]: { $gt: Number(parameters[key]) }});
                                } else if(operator === "lessThan") {
                                    matchFields.push({[key]: { $lt: Number(parameters[key]) }});
                                } else if(operator === "greaterThanOrEqual") {
                                    matchFields.push({[key]: { $gte: Number(parameters[key]) }});
                                } else if(operator === "lessThanOrEqual") {
                                    matchFields.push({[key]: { $lte: Number(parameters[key]) }});
                                } else if(operator === "notEqual") {
                                    matchFields.push({[key]: { $ne: Number(parameters[key]) }});
                                }
                            }
                            else if(dataType === 'date') {
                                matchFields.push({[key]: parameters[key]});
                            }
                        }
                    });
                    if(searchWay.condition === 'or') {
                        match['$or'] = [...matchFields];
                    }
                    else if(searchWay.condition === 'and') {
                        match['$and'] = [...matchFields];
                    }
                }
                console.log(match);

                const targetCollection = database.collection(target);

                const totalDocument = await targetCollection.countDocuments(match);

                const cursor = await targetCollection.aggregate([
                    {
                        $match: match
                    },
                    {
                        $skip: page * limit
                    },
                    {
                        $limit: limit
                    },
                    {
                        $project: project
                    }
                ]).toArray(); 
                console.log(cursor);
                res.status(200).send({
                    target: target,
                    action: action,
                    tableCol: columnOrder,
                    tableRow: cursor,
                    totalPage: Math.ceil(totalDocument / limit),
                });
            }
        });

        // Query for getting all countries
        app.get("/api/countries", async (req, res) => {
            const country = req.query.country || "";
            const countryCollection = database.collection("countries");
            if(country !== "") {
                const cursor = await countryCollection.find({country: { $regex: country, $options: 'i' }}).toArray();
                if(cursor) {
                    res.status(200).send(cursor);
                }
                else {
                    res.status(404).send("");
                }
            } else {
                const cursor = await countryCollection.find({}).toArray();
                if(cursor) {
                    res.status(200).send(cursor);
                }
                else {
                    res.status(404).send("");
                }
            }
        });

        // Query for getting all states
    }
    finally {
        // await client.close();
    }
};

run().catch((error) => console.error(error));

app.use('*', (req, res) => {
    res.status(404).send('Route Not Found');
});

app.listen(port, () => {
    console.log(`App is running on port ${port}`)
});