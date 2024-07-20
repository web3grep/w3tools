function getBalanseN() {
  const networks = [
    { rpc: "https://arb1.arbitrum.io/rpc", token: "ETH" },
    { rpc: "https://mainnet.era.zksync.io", token: "ETH" },
    { rpc: "https://rpc.zora.energy", token: "ETH" },
    { rpc: "https://scroll.blockpi.network/v1/rpc/public", token: "ETH" },
    { rpc: "https://rpc.zora.energy", token: "ETH" },
    { rpc: "https://base.blockpi.network/v1/rpc/public", token: "ETH" },
    { rpc: "https://linea.blockpi.network/v1/rpc/public", token: "ETH" },
    { rpc: "https://optimism.blockpi.network/v1/rpc/public", token: "ETH" },
    { rpc: "https://ethereum.blockpi.network/v1/rpc/public", token: "ETH" },
    { rpc: "https://bsc.blockpi.network/v1/rpc/public", token: "BNB" },
    { rpc: "https://polygon.blockpi.network/v1/rpc/public", token: "MATIC" },
    { rpc: "https://avalanche.blockpi.network/v1/rpc/public", token: "AVAX" },
    { rpc: "https://fantom.blockpi.network/v1/rpc/public", token: "FTM" },
    { rpc: "https://arbitrum-nova.blockpi.network/v1/rpc/public", token: "ETH" },
    { rpc: "https://rpc.mainnet.taiko.xyz", token: "ETH" },
    { rpc: "https://opbnb-mainnet-rpc.bnbchain.org", token: "BNB" },
    { rpc: "https://rpc.blast.io/", token: "ETH" },
    { rpc: "https://mantle.publicnode.com", token: "MNT" },
    { rpc: "https://ethereum-sepolia.blockpi.network/v1/rpc/public", token: "ETH" },
    { rpc: "https://ethereum-holesky.publicnode.com", token: "ETH" },
    { rpc: "https://rpc.ankr.com/blast_testnet_sepolia", token: "ETH" }
  ];

  clearContentsOnly();
  var app = SpreadsheetApp;
  var shet = app.getActiveSpreadsheet();
  var activeSheet = shet.getActiveSheet();

  networks.forEach((network, index) => {
    processNetwork(index + 1, network.rpc, network.token);
  });
}

function processNetwork(slotbec, rpc, TokenNativ) {
  var app = SpreadsheetApp;
  var shet = app.getActiveSpreadsheet();
  var activeSheet = shet.getActiveSheet();

  if (!activeSheet.getRange(3, slotbec * 3).getValue()) return;

  const priceNativ = getPrice(TokenNativ);
  const BATCH_SIZE = 20;
  const MAX_ADDRESSES = 500;

  for (let startRow = 5; startRow < MAX_ADDRESSES; startRow += BATCH_SIZE) {
    var addresses = [];
    for (let i = 0; i < BATCH_SIZE; i++) {
      let address = activeSheet.getRange(startRow + i, 2).getValue();
      if (address == "") break;
      addresses.push(address);
    }
    if (addresses.length === 0) break;

    var balances = getEVMBalances(addresses, rpc);
    var txCounts = getTxCounts(addresses, rpc);

    for (let i = 0; i < addresses.length; i++) {
      let row = startRow + i;
      activeSheet.getRange(row, slotbec * 3).setValue(balances[i]);
      activeSheet.getRange(row, slotbec * 3 + 1).setValue(balances[i] * priceNativ);
      activeSheet.getRange(row, slotbec * 3 + 2).setValue(txCounts[i]);
    }

    Utilities.sleep(2000);
  }
}

function getEVMBalances(addresses, endpoint) {
  var requests = addresses.map((address, index) => ({
    method: "post",
    url: endpoint,
    headers: { "Content-Type": "application/json" },
    payload: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getBalance",
      params: [address, "latest"],
      id: index + 1
    }),
    muteHttpExceptions: true
  }));

  var responses = UrlFetchApp.fetchAll(requests);
  return responses.map(response => {
    try {
      var json = JSON.parse(response.getContentText());
      return parseInt(json.result, 16) / 1e18;
    } catch (e) {
      console.error("Error parsing balance response:", e);
      return 0;
    }
  });
}

function getTxCounts(addresses, endpoint) {
  var requests = addresses.map((address, index) => ({
    method: "post",
    url: endpoint,
    headers: { "Content-Type": "application/json" },
    payload: JSON.stringify({
      jsonrpc: "2.0",
      method: "eth_getTransactionCount",
      params: [address, "latest"],
      id: index + 1
    }),
    muteHttpExceptions: true
  }));

  var responses = UrlFetchApp.fetchAll(requests);
  return responses.map(response => {
    try {
      var json = JSON.parse(response.getContentText());
      return parseInt(json.result, 16);
    } catch (e) {
      console.error("Error parsing tx count response:", e);
      return 0;
    }
  });
}

function getPrice(ticker) {
  // Формируем запрос к KuCoin API для получения информации о цене тикера
  var apiUrl = "https://api.kucoin.com/api/v1/market/orderbook/level1?symbol=" + ticker + "-USDT";
  var response = UrlFetchApp.fetch(apiUrl);
  var json = response.getContentText();
  var data = JSON.parse(json);
  
  // Проверяем, что ответ успешен и содержит нужные данные
  if (data && data.code === "200000" && data.data && data.data.price) {
    return parseFloat(data.data.price);
  } else {
    return 0;
  }
}

function clearContentsOnly() {
  var app = SpreadsheetApp;
  var shet = app.getActiveSpreadsheet();
  var activeSheet = shet.getActiveSheet();
  activeSheet.getRange(5, 3, 600, 63).clearContent();
}
