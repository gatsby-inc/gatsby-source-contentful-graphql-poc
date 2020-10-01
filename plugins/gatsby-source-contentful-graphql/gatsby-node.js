const {
  loadSchema,
  createDefaultQueryExecutor,
  readOrGenerateDefaultFragments,
  compileNodeQueries,
  buildNodeDefinitions,
  createSchemaCustomization,
  sourceAllNodes,
  writeCompiledQueries,
} = require(`gatsby-graphql-source-toolkit`);
require("dotenv").config();

const PaginateContentful = {
  name: "LimitOffsetContenful",
  expectedVariableNames: [`limit`, `offset`],
  start() {
    return {
      variables: { limit: 20, offset: 0 },
      hasNextPage: true,
    };
  },
  next(state, page) {
    const limit = Number(state.variables.limit) || 100;
    const offset = Number(state.variables.offset) + limit;
    return {
      variables: { limit, offset },
      hasNextPage: page.items.length === limit,
    };
  },
  concat(result, page) {
    return result.items.concat(page);
  },
  getItems(pageOrResult) {
    return pageOrResult.items;
  },
};

async function createConfig(gatsbyApi) {
  const spaceId = process.env.SPACE_ID;
  const cdaToken = process.env.CDA_TOKEN;
  const schemaUrl = `https://graphql.contentful.com/content/v1/spaces/${spaceId}?access_token=${cdaToken}`;

  const execute = createDefaultQueryExecutor(schemaUrl);
  const schema = await loadSchema(execute);

  const type = schema.getType(`Query`);
  const collectionTypes = Object.keys(type.getFields()).filter((k) =>
    k.includes("Collection")
  );

  const gatsbyNodeTypes = collectionTypes.map((t) => {
    const typeName = t.replace(`Collection`, ``);
    const remoteTypeName = typeName.charAt(0).toUpperCase() + typeName.slice(1);
    const queries = `
      query LIST_${remoteTypeName} ($limit: Int, $offset: Int) {
        ${t}(limit: $limit, skip: $offset) {
          items { ..._${remoteTypeName}Id_ }
        }
      }
      fragment _${remoteTypeName}Id_ on ${remoteTypeName} {
        __typename
        sys { id }
      }
    `;

    return { remoteTypeName, queries };
  });

  const fragments = await readOrGenerateDefaultFragments(`./`, {
    schema,
    gatsbyNodeTypes,
  });

  const documents = compileNodeQueries({
    schema,
    gatsbyNodeTypes,
    customFragments: fragments,
  });

  await writeCompiledQueries("./sourcing-queries", documents);

  return {
    gatsbyApi,
    schema,
    execute,
    gatsbyTypePrefix: `Contentful`,
    gatsbyNodeDefs: buildNodeDefinitions({ gatsbyNodeTypes, documents }),
    paginationAdapters: [PaginateContentful],
  };
}

exports.sourceNodes = async (gatsbyApi) => {
  const config = await createConfig(gatsbyApi);

  await createSchemaCustomization(config);

  await sourceAllNodes(config);
};
