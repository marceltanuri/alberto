var formatter = new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'BRL',
});

let chartData;

function buildReport(json) {

    chartData = [['Category', 'Total']]

    document.querySelector(".container-report").style.display = 'block'

    document.querySelector(".report").innerHTML = ""
    document.querySelector(".details").innerHTML = ""
    document.querySelector(".totals").innerHTML = ""
    document.querySelector(".incomings").innerHTML = ""
    document.querySelector("#piechart").innerHTML = ""

    json.expensesGroup.forEach(expenseGroup => {

        // add category to chart
        chartData.push([expenseGroup.name, expenseGroup.limit + (expenseGroup.availableValue >= 0 ? 0 : (expenseGroup.availableValue * -1))])
        console.log([expenseGroup.name, expenseGroup.limit + (expenseGroup.availableValue >= 0 ? 0 : (expenseGroup.availableValue * -1))])

        // Sumary
        let expenseGroupDiv = document.createElement("div")
        expenseGroupDiv.style.cursor = "pointer"
        expenseGroupDiv.classList = "expenseGroupClickDiv"
        let _innerHTML = `<b>${expenseGroup.name}</b>`
        _innerHTML += "<br/>"
        _innerHTML += `Valor disponível: <span class="availableValue">${formatter.format((expenseGroup.availableValue))}</span>`
        _innerHTML += "<br/>"
        _innerHTML += `Valor utilizado: ${formatter.format((expenseGroup.expensesSum * -1))}  | <span class="usedValue">${expenseGroup.expenseSumPercentage} % (used)</span>  | ${(expenseGroup.availableValuePercentage >= 0 ? "<span class='availablePositive'>" + expenseGroup.availableValuePercentage + "% (free)</span>" : "<span class='availableNegative'>" + expenseGroup.availableValuePercentage + "% (free)</span>")}`
        _innerHTML += "<br/>"
        _innerHTML += `Valor limite: ${formatter.format(expenseGroup.limit)}`
        _innerHTML += "<br/>"
        expenseGroupDiv.innerHTML = _innerHTML

        // Details Button
        let detailsButton = document.createElement("a")
        detailsButton.classList = "details-button"
        detailsButton.setAttribute("href", "javascript:void(0);")
        detailsButton.innerHTML = `<i class="fa-solid fa-circle-info"></i>&nbsp;Detalhes`
        expenseGroupDiv.addEventListener("click", () => {
            document.querySelectorAll(`.details-list`).forEach(item => {
                item.style.display = 'none'
            })
            document.querySelector(`.${expenseGroup.name}-details`).style.display = 'block'
        });
        expenseGroupDiv.appendChild(detailsButton)
        expenseGroupDiv.appendChild(document.createElement("br"))

        breakLines(expenseGroupDiv, 2)
        document.querySelector(".report").appendChild(expenseGroupDiv)

        // Details Itens
        let expenseGroupDetailsDiv = document.createElement("div")
        expenseGroupDetailsDiv.classList = `details-list ${expenseGroup.name}-details`
        expenseGroupDetailsDiv.style.display = 'none'

        let _innerHTMLDetails = ""
        expenseGroup.expenses.forEach(expense => {
            _innerHTMLDetails += `<div class="details-list-item">${expense.date} <span class='expenseDesc'> ${expense.description} </span>  ${formatter.format(expense.value)}</div>`
        })

        // Details for FixedExpenses Itens
        if (expenseGroup.fixedExpenses != undefined) {
            _innerHTMLDetails += "<br/>"
            expenseGroup.fixedExpenses.forEach(expense => {
                _innerHTMLDetails += `<span class='expenseDesc'>${expense.name}</span> ${formatter.format(expense.value)} <span class='paid-${expense.paid}'></span>`
                _innerHTMLDetails += "<br/>"
            })
        }

        expenseGroupDetailsDiv.innerHTML = _innerHTMLDetails
        let detailsDiv = document.querySelector(".details")
        detailsDiv.appendChild(expenseGroupDetailsDiv)
    });

    // Totals
    let _totalsDiv = document.querySelector(".totals")
    breakLines(_totalsDiv)
    let _innerHTML = "<br/>"
    _innerHTML += `Despesas restantes: <span class="pendingExpenses">${json.totals.pendingExpenses}</span>`
    _innerHTML += "<br/>"
    _innerHTML += `<b>Total disponível: <span class="totalAvailable">${json.totals.available}</span></b>`
    _innerHTML += "<br/>"
    _innerHTML += `Total gasto: ${json.totals.gross}`
    _innerHTML += "<br/>"
    _innerHTML += `Despesa prevista: ${json.totals.previewedExpenses}`
    _innerHTML += "<br/>"
    _innerHTML += `Despesa em curso: ${json.totals.realExpenses}`
    _innerHTML += "<br/>"

    _totalsDiv.innerHTML = _innerHTML

    chartData.push(['Saldo', parseFloat(json.totals.available.replace('R$', '').replace(',', '.'))])
    console.log(['Saldo', parseFloat(json.totals.available.replace('R$', '').replace(',', '.'))])

    let _innerHTMLIncomings = ""
    json.incomings.data.forEach(incoming => {
        _innerHTMLIncomings += `<div class="incoming-list-item">${incoming.date} <span class='incomingDesc'>${incoming.description}</span> ${formatter.format(incoming.value)}</div>`
    })
    _innerHTMLIncomings += "<br/>"
    _innerHTMLIncomings += `Total de receitas: <span class="totalIncomings">${json.incomings.sum}</span>`

    if (json.estimatedIncomings != undefined) {
        _innerHTMLIncomings += "<br/><br/>"
        json.estimatedIncomings.forEach(incoming => {
            _innerHTMLIncomings += `<span class='incomingDesc'>${incoming.name}</span> ${formatter.format(incoming.value)} <span class='paid-${incoming.paid}'></span>`
            _innerHTMLIncomings += "<br/>"
        })
    }

    let incomingsDetailsDiv = document.createElement("div")
    incomingsDetailsDiv.innerHTML = _innerHTMLIncomings
    let incomingsDiv = document.querySelector(".incomings")
    incomingsDiv.appendChild(incomingsDetailsDiv)

    google.charts.load('current', { 'packages': ['corechart'] });

    try {
        google.charts.setOnLoadCallback(drawChart);
    }
    catch (e) {
        console.error(e)
    }
}

function breakLines(elem, times) {
    let count = 1
    do {
        let _hr = document.createElement("hr")
        elem.appendChild(_hr)
    } while (++count <= times)

}

function drawChart() {

    var options = {
        title: 'Report',
        pieHole: 0.4,
        slices: {
            9: { offset: 0.2 }
        },
        backgroundColor: "#242424",
        legend: {
            textStyle: { color: "#6495ed" }
        },
        titleTextStyle: { color: "#6495ed" }
    };

    var data = google.visualization.arrayToDataTable(chartData);

    var chart = new google.visualization.PieChart(document.getElementById('piechart'));

    chart.draw(data, options);
}


const _spreadsheetId = ''

['input'].forEach(evt => {
    document.querySelector("#password").addEventListener(evt, function () {
        _spreadsheetId = this.value
    })
}
);