const neo4jUri = "bolt://localhost:7687"; // Neo4j URI
const neo4jUser = "neo4j"; // Neo4j username
const neo4jPassword = "treetree"; // Neo4j password

const driver = neo4j.driver(neo4jUri, neo4j.auth.basic(neo4jUser, neo4jPassword));

// NeoVis configuration
const config = {
    container_id: "graph",
    server_url: neo4jUri,
    server_user: neo4jUser,
    server_password: neo4jPassword,
    labels: {
        "Person": {
            caption: "name",
            size: 30
        }
    },
    relationships: {},
    initial_cypher: "MATCH (n)-[r]->(m) RETURN n, r, m LIMIT 25"
};

// Render the initial graph
const neovis = new NeoVis.default(config);
neovis.render();

// Fetch and log all nodes to console using Neo4j driver
async function logAllNodes() {
    const session = driver.session();
    try {
        const result = await session.run("MATCH (n) RETURN n.name AS name");
        const nodeNames = result.records.map(record => record.get('name'));
        populateNodeSuggestions(nodeNames);
    } catch (error) {
        console.error("Error fetching nodes:", error);
    } finally {
        await session.close();
    }
}

// Populate auto-suggest for nodes
function populateNodeSuggestions(nodeNames) {
    const nodeSuggestions1 = document.getElementById('nodeSuggestions1');
    const nodeSuggestions2 = document.getElementById('nodeSuggestions2');
    nodeNames.forEach(name => {
        const option1 = document.createElement('option');
        option1.value = name;
        nodeSuggestions1.appendChild(option1);

        const option2 = document.createElement('option');
        option2.value = name;
        nodeSuggestions2.appendChild(option2);
    });
}

// Function to find and highlight relationships between two nodes
async function findAllRelationships(nodeName1, nodeName2) {
    const session = driver.session();
    try {
        // Ensure that both node names are provided
        if (!nodeName1 || !nodeName2) {
            console.log("Please provide both node names.");
            return;
        }

        // Cypher query to find the shortest path between two nodes
        const cypherQuery = `
            MATCH p=shortestPath((n1:Person {name: $nodeName1})-[*]-(n2:Person {name: $nodeName2}))
            RETURN p
        `;

        const result = await session.run(cypherQuery, {
            nodeName1: nodeName1,
            nodeName2: nodeName2
        });

        const relationshipInfoDiv = document.getElementById("relationshipInfo");
        relationshipInfoDiv.innerHTML = ""; // Clear previous results

        if (result.records.length > 0) {
            const path = result.records[0].get('p');
            const nodes = path.nodes.map(node => node.properties.name);

            const relationshipDescription = nodes.join(" -> ");
            const p = document.createElement('p');
            p.textContent = `Shortest path: ${relationshipDescription}`;
            relationshipInfoDiv.appendChild(p);

            // Highlight the shortest path in the graph
            highlightPath(nodeName1, nodeName2);
        } else {
            console.log("No relationships found.");
            relationshipInfoDiv.innerHTML = "<p>No relationships found.</p>";
        }
    } catch (error) {
        console.error("Error finding relationships:", error);
        document.getElementById("relationshipInfo").innerHTML = "<p>Error finding relationships.</p>";
    } finally {
        await session.close();
    }
}

// Highlight the shortest path in Neovis
function highlightPath(nodeName1, nodeName2) {
    const query = `
        MATCH p=shortestPath((n1:Person {name: $nodeName1})-[*]-(n2:Person {name: $nodeName2}))
        RETURN p
    `;

    neovis.renderWithCypher(query, {
        nodeName1: nodeName1,
        nodeName2: nodeName2
    });
}

// Event listener for "Find Relationships" button
document.getElementById("findRelationshipsButton").addEventListener("click", () => {
    const nodeName1 = document.getElementById("node1Input").value;
    const nodeName2 = document.getElementById("node2Input").value;
    findAllRelationships(nodeName1, nodeName2);
});

// Call function to log all nodes when the page loads
logAllNodes();
