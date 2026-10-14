const spaceImport = require("contentful-import");
const exportFile = require("./export.json");

const { CONTENTFUL_SPACE_ID, CONTENTFUL_MANAGEMENT_TOKEN } = process.env;

if (!CONTENTFUL_SPACE_ID || !CONTENTFUL_MANAGEMENT_TOKEN) {
  throw new Error(
    [
      "Parameters missing...",
      "Set CONTENTFUL_SPACE_ID and CONTENTFUL_MANAGEMENT_TOKEN in .env.local",
      "(see .env.local.example), or pass them inline:",
      "CONTENTFUL_SPACE_ID=XXX CONTENTFUL_MANAGEMENT_TOKEN=CFPAT-XXX npm run setup",
    ].join("\n"),
  );
}

spaceImport({
  spaceId: CONTENTFUL_SPACE_ID,
  managementToken: CONTENTFUL_MANAGEMENT_TOKEN,
  content: exportFile,
})
  .then(() => console.log("The content model of your space is set up!"))
  .catch((e) => console.error(e));
