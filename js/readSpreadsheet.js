/* exported gapiLoaded */
/* exported gisLoaded */
/* exported handleAuthClick */
/* exported handleSignoutClick */

let tokenClient;
let gapiInited = false;
let gisInited = false;

document.getElementById('authorize_button').style.visibility = 'hidden';
document.getElementById('signout_button').style.visibility = 'hidden';

/**
 * Callback after api.js is loaded.
 */
function gapiLoaded() {
    gapi.load('client', intializeGapiClient);
}

/**
 * Callback after the API client is loaded. Loads the
 * discovery doc to initialize the API.
 */
async function intializeGapiClient() {
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: [DISCOVERY_DOC],
    });
    gapiInited = true;
    maybeEnableButtons();
}

/**
 * Callback after Google Identity Services are loaded.
 */
function gisLoaded() {
    tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: '', // defined later
    });
    gisInited = true;
    maybeEnableButtons();
}

/**
 * Enables user interaction after all libraries are loaded.
 */
function maybeEnableButtons() {
    if (gapiInited && gisInited) {
        document.getElementById('authorize_button').style.visibility = 'visible';
    }
}

/**
 *  Sign in the user upon button click.
 */
function handleAuthClick() {
    tokenClient.callback = async (resp) => {
        if (resp.error !== undefined) {
            throw (resp);
        }
        document.getElementById('signout_button').style.visibility = 'visible';
        document.getElementById('authorize_button').innerText = 'Refresh';
        await readSpreadsheet();
    };

    if (gapi.client.getToken() === null) {
        // Prompt the user to select a Google Account and ask for consent to share their data
        // when establishing a new session.
        tokenClient.requestAccessToken({ prompt: 'consent' });
    } else {
        // Skip display of account chooser and consent dialog for an existing session.
        tokenClient.requestAccessToken({ prompt: '' });
    }
}

/**
 *  Sign out the user upon button click.
 */
function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        document.getElementById('content').innerText = '';
        document.getElementById('authorize_button').innerText = 'Authorize';
        document.getElementById('signout_button').style.visibility = 'hidden';
    }
}

/**
 * Print the names and majors of students in a sample spreadsheet:
 * https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 */

async function readSpreadsheet() {

    _bankTransactions = { "data": [] }
    _budget = {
        "data": [],
        "incomings": []
    }

    try {
        let response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: _spreadsheetId,
            range: 'Lançamentos!A2:D250',
        });
        if (response.result.values != undefined)
            response.result.values.forEach(element => {
                _bankTransactions.data.push({
                    "Data lancamento": element[2],
                    "Data valor": element[2],
                    "Descricao": element[0] + (element[3] != undefined ? " - " + element[3] : ""),
                    "Montante": element[1] != undefined && element[1] != '' ? parseFloatFromCurrency(element[1])*-1 : 0.0,
                    "Categoria": element[0],
                    "Tipo": "Debito"
                })
            });
    } catch (err) {
        console.log(err)
        document.getElementById('content').innerText = err.message;
    }

    try {
        let response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: _spreadsheetId,
            range: 'Configuração!A2:B50',
        });
        response.result.values.forEach(element => {
            if (element[0] != undefined && element.length >= 2) {
                _budget.data.push({
                    "desc": element[0],
                    "limit": element[1] != undefined && element[1] != '' ? parseFloatFromCurrency(element[1]) : 0.0,
                    "fixed_expenses": []
                })
            }
        });
    } catch (err) {
        console.log(err)
        document.getElementById('content').innerText = err.message;
    }

    try {
        let response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: _spreadsheetId,
            range: 'Despesas Fixas!A2:E50',
        });
        response.result.values.forEach(element => {
            if (element[0] != undefined && element.length >= 3) {

                let category = _budget.data.find(elm => {
                    return elm.desc == element[0]
                })

                if (category != undefined) {
                    category.fixed_expenses.push({
                        "name": element[1],
                        "value": element[2] != undefined && element[2] != '' ? parseFloatFromCurrency(element[2]) : 0.0,
                        "paid": element[3] === "TRUE"
                    })
                }

            }
        });
    } catch (err) {
        console.log(err)
        document.getElementById('content').innerText = err.message;
    }

    try {
        let response = await gapi.client.sheets.spreadsheets.values.get({
            spreadsheetId: _spreadsheetId,
            range: 'Receitas!A2:B25',
        });
        response.result.values.forEach(element => {
            if (element[0] != undefined && element.length >= 2) {
                _budget.incomings.push({
                    "name": element[0],
                    "value": element[1] != undefined && element[1] != '' ? parseFloatFromCurrency(element[1]) : 0.0,
                    "regex": ""
                })
            }
        });
    } catch (err) {
        console.log(err)
        document.getElementById('content').innerText = err.message;
    }

    let _json = new Transactions(_bankTransactions, _budget).toJSON();
    chartData = []
    buildReport(_json)

}

function parseFloatFromCurrency(currency) {
    var number = Number(currency.replace(/[^0-9\.-]+/g, ""));
    return parseFloat(number)
}