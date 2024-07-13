//придумано и заказано (concepted & prompted by) web3grep https://t.me/w3bgrep
//выполнено (builded by) CLAUDE 3.5 SONNET https://web3topia.wtf/perplexity




// Конфигурация скрипта
const CONFIG = {
  // Настройки для обработки адресов и балансов
  PROCESSING: {
    START_ROW: 2,           // Начальная строка для записи данных
    START_COLUMN: 6,        // Начальная колонка для записи данных (F)
    ADDRESS_COLUMN: 1,      // Колонка с адресами (A)
    MAX_ADDRESSES: 500,     // Максимальное количество адресов для обработки
    BATCH_SIZE: 20,         // Размер пакета для запросов
    SLEEP_TIME: 2000,       // Время ожидания между запросами (мс)
  },
  
  // Настройки для очистки содержимого
  CLEAR_RANGE: {
    startRow: 2,
    startCol: 6,
    numRows: 600,
    numCols: 21
  },
  
  // Условия форматирования для разных токенов
  FORMAT_CONDITIONS: {
    ETH: {
      RED: 0.0001,
      ORANGE: 0.0005,
      YELLOW: 0.001,
      GREEN: 0.01
    },
    BNB: {
      RED: 0.001,
      ORANGE: 0.005,
      YELLOW: 0.01,
      GREEN: 0.1
    },
    MATIC: {
      RED: 0.1,
      ORANGE: 0.5,
      YELLOW: 1,
      GREEN: 10
    },
    // Добавьте другие токены по необходимости
  }
};

// Список сетей
const NETWORKS = [
  { rpc: "https://ethereum.blockpi.network/v1/rpc/public", token: "ETH" },
  { rpc: "https://arb1.arbitrum.io/rpc", token: "ETH" },
  { rpc: "https://optimism.blockpi.network/v1/rpc/public", token: "ETH" },
  { rpc: "https://base.blockpi.network/v1/rpc/public", token: "ETH" },
  { rpc: "https://mainnet.era.zksync.io", token: "ETH" },
  { rpc: "https://scroll.blockpi.network/v1/rpc/public", token: "ETH" },
  { rpc: "https://linea.blockpi.network/v1/rpc/public", token: "ETH" },
  { rpc: "https://rpc.blast.io/", token: "ETH" },
  { rpc: "https://rpc.zora.energy", token: "ETH" },
  { rpc: "https://rpc.mainnet.taiko.xyz", token: "ETH" },
  { rpc: "https://arbitrum-nova.blockpi.network/v1/rpc/public", token: "ETH" },
  { rpc: "https://bsc.blockpi.network/v1/rpc/public", token: "BNB" },
  { rpc: "https://opbnb-mainnet-rpc.bnbchain.org", token: "BNB" },
  { rpc: "https://polygon.blockpi.network/v1/rpc/public", token: "MATIC" },
  { rpc: "https://mantle.publicnode.com", token: "MNT" },
  { rpc: "https://avalanche.blockpi.network/v1/rpc/public", token: "AVAX" },
  { rpc: "https://fantom.blockpi.network/v1/rpc/public", token: "FTM" },
  { rpc: "https://ethereum-sepolia.blockpi.network/v1/rpc/public", token: "ETH" },
  { rpc: "https://ethereum-holesky.publicnode.com", token: "ETH" },
];

function getNative() {
  clearContentsOnly();
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();

  NETWORKS.forEach((network, index) => {
    processNetwork(index + 1, network.rpc, network.token, sheet);
    applyConditionalFormatting(sheet, index + 1, network.token);
  });
}

function processNetwork(slotbec, rpc, tokenNativ, sheet) {
  for (let startRow = CONFIG.PROCESSING.START_ROW; startRow < CONFIG.PROCESSING.MAX_ADDRESSES; startRow += CONFIG.PROCESSING.BATCH_SIZE) {
    const addresses = getAddresses(sheet, startRow);
    if (addresses.length === 0) break;

    try {
      const balances = getEVMBalances(addresses, rpc);
      if (balances && balances.length > 0) {
        writeBalances(sheet, startRow, slotbec, balances);
      } else {
        console.error(`No balances returned for RPC: ${rpc}`);
      }
    } catch (error) {
      console.error(`Error processing network ${tokenNativ}: ${error.message}`);
    }

    Utilities.sleep(CONFIG.PROCESSING.SLEEP_TIME);
  }
}

function getAddresses(sheet, startRow) {
  const addresses = [];
  for (let i = 0; i < CONFIG.PROCESSING.BATCH_SIZE; i++) {
    const address = sheet.getRange(startRow + i, CONFIG.PROCESSING.ADDRESS_COLUMN).getValue();
    if (address === "") break;
    addresses.push(address);
  }
  return addresses;
}

function getEVMBalances(addresses, endpoint) {
  const requests = addresses.map((address, index) => ({
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

  try {
    const responses = UrlFetchApp.fetchAll(requests);
    return responses.map(response => {
      try {
        const json = JSON.parse(response.getContentText());
        if (json.error) {
          console.error(`RPC error: ${JSON.stringify(json.error)}`);
          return 0;
        }
        return parseInt(json.result, 16) / 1e18;
      } catch (e) {
        console.error("Error parsing balance response:", e);
        return 0;
      }
    });
  } catch (error) {
    console.error(`Error fetching balances: ${error.message}`);
    return addresses.map(() => 0); // Возвращаем массив нулей в случае ошибки
  }
}

function writeBalances(sheet, startRow, slotbec, balances) {
  if (!Array.isArray(balances)) {
    console.error("Balances is not an array:", balances);
    return;
  }
  balances.forEach((balance, index) => {
    sheet.getRange(startRow + index, slotbec + CONFIG.PROCESSING.START_COLUMN - 1).setValue(balance);
  });
}

function clearContentsOnly() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  sheet.getRange(
    CONFIG.CLEAR_RANGE.startRow,
    CONFIG.CLEAR_RANGE.startCol,
    CONFIG.CLEAR_RANGE.numRows,
    CONFIG.CLEAR_RANGE.numCols
  ).clearContent();
}

function applyConditionalFormatting(sheet, columnIndex, token) {
  const column = columnIndex + CONFIG.PROCESSING.START_COLUMN - 1;
  const columnLetter = columnToLetter(column);
  const range = sheet.getRange(`${columnLetter}${CONFIG.PROCESSING.START_ROW}:${columnLetter}`);
  
  const rules = [];
  
  // Правило для нулевых значений (применяется ко всем токенам)
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberEqualTo(0)
    .setBackground("#FFFFFF")
    .setFontColor("#FFFFFF")
    .setRanges([range])
    .build());
  
  // Применяем форматирование только если есть условия для данного токена
  if (CONFIG.FORMAT_CONDITIONS[token]) {
    const conditions = CONFIG.FORMAT_CONDITIONS[token];
    
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenNumberLessThan(conditions.RED)
      .setBackground("#FF0000")
      .setFontColor("#000000")
      .setRanges([range])
      .build());
    
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(conditions.RED, conditions.ORANGE)
      .setBackground("#FFA500")
      .setFontColor("#000000")
      .setRanges([range])
      .build());
    
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(conditions.ORANGE, conditions.YELLOW)
      .setBackground("#FFFF00")
      .setFontColor("#000000")
      .setRanges([range])
      .build());
    
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenNumberBetween(conditions.YELLOW, conditions.GREEN)
      .setBackground("#00FF00")
      .setFontColor("#000000")
      .setRanges([range])
      .build());
    
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenNumberGreaterThanOrEqualTo(conditions.GREEN)
      .setBackground("#00FFFF")
      .setFontColor("#000000")
      .setRanges([range])
      .build());
  }
  
  // Получаем текущие правила и добавляем новые
  const currentRules = sheet.getConditionalFormatRules();
  sheet.setConditionalFormatRules(currentRules.concat(rules));
}

function columnToLetter(column) {
  let temp, letter = '';
  while (column > 0) {
    temp = (column - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    column = (column - temp - 1) / 26;
  }
  return letter;
}
