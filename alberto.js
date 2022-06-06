let _bankTransactions = { "data": [] }
let _budget = {
    "data": [],
    "incomings": []
}

class Transactions {
    constructor(bankTransactions, budget) {

        var all_transactions = []

        // bank balance
        this.balance = 0

        all_transactions = bankTransactions.data

        // incomings
        this.estimatedIncomings = budget.incomings
        this.incomings = []

        // load expensesGroup based on budget data
        this.expensesGroup = []
        budget.data.forEach(cat => {
            this.expensesGroup.push(new ExpenseGroup(cat))
        })

        // adds a default group for non categorized transactions
        this.expensesGroup.push(new ExpenseGroup({
            "desc": "Outros",
            "limit": 0.001,
            "default": true,
            "regex": []
        }))

        // populates expensesGroup with transactions from json (bank & ticket)
        all_transactions.filter(transaction => transaction.Tipo === "Debito").forEach(debtTransaction => {
            this.addExpenseToExpenseGroupUsingExpDescriptionAndGroupRegexConfig(debtTransaction.Categoria, debtTransaction.Descricao, debtTransaction["Data lancamento"], debtTransaction.Montante)
        })

        all_transactions.filter(transaction => transaction.Tipo === "Credito").forEach(creditTransaction => {
            this.addIncoming(creditTransaction.Descricao, creditTransaction["Data lancamento"], creditTransaction.Montante)
        })
    }

    getIncomingsSum() {
        let sum = 0
        this.incomings.forEach(incoming => {
            sum += parseFloat(incoming.value)
        })

        // reads estimatedIncomings and even if it's not paid yet its value is considered in the sum
        this.getEstimatedIncomings().forEach(estimatedIncoming => {
            if (!estimatedIncoming.paid) {
                sum += estimatedIncoming.value
            }
        })

        return sum
    }

    /**
     * 
     * @returns Incomings sorted by date
     */
    getIncomings() {
        const sortedIncomings = this.incomings.slice().sort((a, b) => (new Date(a.date.replace(/(\d{2})-(\d{2})-(\d{4})/, "$2/$1/$3")) - new Date(b.date.replace(/(\d{2})-(\d{2})-(\d{4})/, "$2/$1/$3"))))
        return sortedIncomings
    }

    /**
     * Adds the expense the correct expenseGroup based on expense description
     * @param {*} description 
     * @param {*} date 
     * @param {*} value 
     */
    addExpenseToExpenseGroupUsingExpDescriptionAndGroupRegexConfig(category, description, date, value) {

        let expenseGroup = this.expensesGroup.find(_expenseGroup => {
            return _expenseGroup.name == category
        })

        if (expenseGroup == null) {
            expenseGroup = this.expensesGroup.find(_expenseGroup => {
                return _expenseGroup.default === true
            })
        }

        if (expenseGroup != null) {
            expenseGroup.addExpense(description, date, value)
        }
    }

    addIncoming(description, date, value) {
        this.incomings.push(new Incoming(description, date, value))
    }

    getGroupAvailableValueSum() {
        let sum = 0.0
        this.expensesGroup.forEach(elm => {
            let avl = elm.getAvailableValue()
            if (avl > 0) {
                sum += avl
            }
        })
        return sum;
    }

    getGroupExpensesSum() {
        let sum = 0.0
        this.expensesGroup.forEach(elm => {
            sum = sum + elm.getExpensesSum()
        })
        return sum;
    }

    getTotalSaved() {
        let totalSaved = parseFloat(this.balance)

        if (this.ticketBalance != "") {
            totalSaved += parseFloat(this.ticketBalance)
        }

        totalSaved -= (this.getGroupAvailableValueSum())

        return totalSaved
    }

    getTotalBalance() {
        let sum = 0.0

        if (this.balance != "")
            sum += parseFloat(this.balance)

        if (this.ticketBalance != "")
            sum += parseFloat(this.ticketBalance)

        return sum
    }

    getLimitSum() {
        let sum = 0.0
        this.expensesGroup.forEach(elm => { sum += parseFloat(elm.limit) })
        return sum
    }

    getEstimatedIncomings() {

        this.estimatedIncomings.forEach(estimatedIncoming => {
            estimatedIncoming.paid = (this.incomings.some(incoming => {
                return incoming.description.includes(estimatedIncoming.regex)
            }))
        })

        return this.estimatedIncomings

    }

    toJSON() {
        var formatter = new Intl.NumberFormat('pt-PT', {
            style: 'currency',
            currency: 'EUR',
        });

        let json = {}

        json.expensesGroup = []

        this.expensesGroup.forEach(expenseGroup => {
            let _expenseGroup = expenseGroup
            _expenseGroup.availableValue = expenseGroup.getAvailableValue()
            _expenseGroup.expensesSum = expenseGroup.getExpensesSum()
            _expenseGroup.expenseSumPercentage = expenseGroup.getExpenseSumPercentage()
            _expenseGroup.availableValuePercentage = expenseGroup.getAvailableValuePercentage()
            _expenseGroup.expenses = expenseGroup.getExpenses()
            _expenseGroup.fixedExpenses = expenseGroup.getFixedExpenses()
            json.expensesGroup.push(_expenseGroup)
        })

        json.totals = {}

        json.totals.balance = formatter.format(this.getTotalBalance())
        json.totals.pendingExpenses = formatter.format(this.getGroupAvailableValueSum())
        json.totals.available = formatter.format(this.getIncomingsSum() - (this.getGroupAvailableValueSum() - this.getGroupExpensesSum()))
        json.totals.gross = formatter.format(this.getGroupExpensesSum())
        json.totals.previewedExpenses = formatter.format(this.getLimitSum())
        json.totals.realExpenses = formatter.format(this.getGroupAvailableValueSum() - this.getGroupExpensesSum())

        json.totals.cc = formatter.format(this.balance)

        if (this.ticketBalance != "") {
            json.totals.ticket = formatter.format(this.ticketBalance)
        }

        json.incomings = {}
        json.estimatedIncomings = this.getEstimatedIncomings()
        json.incomings.data = this.getIncomings()
        json.incomings.sum = formatter.format(this.getIncomingsSum())

        return json
    }
}

class ExpenseGroup {
    constructor(cat) {
        this.name = cat.desc
        this.default = cat.default
        this.regex = cat.regex
        if (cat.limit != undefined)
            this.limit = cat.limit
        if (cat.fixed_expenses != undefined) {
            this.fixedExpenses = cat.fixed_expenses
            let limit = 0
            cat.fixed_expenses.forEach(exp => {
                limit += parseFloat(exp.value)
            })
            this.limit = limit
        }

        this.expenses = []
    }

    addExpense(desc, date, value) {
        this.expenses.push(new Expense(this.name, desc, date, value))
    }

    /**
     * 
     * @returns FixedExpenses enhanced list containing the boolean value isPaid
     */
    getFixedExpenses() {
        if (this.fixedExpenses != undefined) {
            let _fixedExpenses = this.fixedExpenses
            _fixedExpenses.forEach(fixexp => {
                fixexp.paid = this.isFixedExpensePaid(fixexp)
            })
            return _fixedExpenses
        }
    }

    /**
     * 
     * @param {*} fixedExpense 
     * @returns true if FixedExpense value is equals to any expense value and at least one word of FixedExpense name is found in any expense description.
     */
    isFixedExpensePaid(fixedExpense) {

        this.expenses.filter(exp => {
            return exp.value == (fixedExpense.value * -1)
        })

        let _paid = false
        this.expenses.forEach(exp => {
            if (exp.value == (fixedExpense.value * -1)) {
                let _words = fixedExpense.name.toLowerCase().split(" ")
                _words.forEach(word => {
                    if (exp.description.toLowerCase().includes(word.toLowerCase())) {
                        _paid = true
                        return _paid
                    }
                })
            }
        })
        return _paid
    }

    getExpensesSum() {
        let sum = 0.0
        this.expenses.forEach(elm => { sum = sum + parseFloat(elm.value) })
        return sum
    }

    getExpenseSumPercentage() {
        return Math.round((this.getExpensesSum() * -1) / this.limit * 100).toPrecision(3)
    }

    getAvailableValuePercentage() {
        return Math.round(100 - (this.getExpensesSum() * -1) / this.limit * 100).toPrecision(3)
    }

    // returns expenses list sorted by date
    getExpenses() {
        const sortedExpeneses = this.expenses.slice().sort((a, b) => (new Date(a.date.replace(/(\d{2})-(\d{2})-(\d{4})/, "$2/$1/$3")) - new Date(b.date.replace(/(\d{2})-(\d{2})-(\d{4})/, "$2/$1/$3"))))
        return sortedExpeneses
    }

    getAvailableValue() {
        return parseFloat(this.limit) + this.getExpensesSum()
    }
}
class Expense {
    constructor(group, description, date, value) {
        this.group = group
        this.description = description
        this.date = date
        this.value = value
    }
}

class Incoming {
    constructor(description, date, value) {
        this.description = description
        this.date = date
        this.value = value
    }
}

console.log(new Transactions(_bankTransactions, _budget).toJSON())