import idb from "idb";

const dbName = "jestrPioneerShieldStudy";

let db;

export async function initDb() {
  await idb.delete(dbName);
  db = await idb.open(dbName, 1, upgradeDB => {
    upgradeDB.createObjectStore("studyLog", {
      autoIncrement: true,
    });
    upgradeDB.createObjectStore("navigations", {
      autoIncrement: true,
    });
  });
}

async function getAllData(objectStoreName) {
  let tx = db.transaction(objectStoreName, "readonly");
  let store = tx.objectStore(objectStoreName);
  let allSavedItems = await store.getAll();
  return allSavedItems;
}

export async function storeInDb(objectStoreName, object) {
  console.log("storeInDb", objectStoreName, object);
  let tx = db.transaction(objectStoreName, "readwrite");
  let store = tx.objectStore(objectStoreName);
  await store.put(object);
  await tx.complete;
}

export async function dumpDbContents() {
  console.log("Dumping Database Contents");
  console.log("=========================");

  const studyLogDbContents = await getAllData("studyLog");
  console.log("studyLogDbContents", studyLogDbContents);
  const navigationsDbContents = await getAllData("navigations");
  console.log("navigationsDbContents", navigationsDbContents);

  console.log("=========================");
  console.log("Dumping Database Contents - Done");
}
