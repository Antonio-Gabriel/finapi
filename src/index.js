const { request, response } = require('express')
const express = require('express')

const { v4: uuidv4 } = require('uuid')

const app = express()

app.use(express.json())

const storage = []

// Middleware
function verifyIfExistsAccountCPF(request, response, next) {
  const { cpf } = request.headers

  const statementsByCustomers = storage.find((customer) => customer.cpf === cpf)

  if (!statementsByCustomers) {
    return response.status(404).json({
      error: 'Customer not found!',
    })
  }

  request.customer = statementsByCustomers

  return next()
}

function getBalance(statement) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === 'credit') {
      return acc + operation.amount
    }

    return acc - operation.amount
  }, 0)

  return balance
}

app.get('/', (_, res) => {
  return res.send({
    msg: 'Finapi, welcome',
  })
})

app.post('/account', (req, res) => {
  const { cpf, name } = req.body

  const customerAlreadyExists = storage.some((customer) => customer.cpf === cpf)

  if (customerAlreadyExists) {
    return res.status(400).json({
      error: 'Account Already exists!',
    })
  }

  storage.push({
    id: uuidv4(),
    cpf,
    name,
    statements: [],
  })

  return res.status(201).json({
    msg: 'Account successfully created!',
  })
})

app.get('/customers', (req, res) => {
  const { customer } = req

  return res.status(200).json(customer)
})

app.get('/statements', verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req
  return res.status(200).json(customer.statements)
})

app.post('/deposit', verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req
  const { description, amount } = req.body

  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: 'credit',
  }

  if (customer.statements.push(statementOperation)) {
    return res.status(201).json({
      msg: `Deposited ${amount} for ${customer.name}`,
    })
  }
})

app.post('/withdraw', verifyIfExistsAccountCPF, (req, res) => {
  const { amount } = req.body
  const { customer } = req

  const balance = getBalance(customer.statements)

  if (balance < amount) {
    return res.status(400).json({
      msg: 'Insufficient funds!',
    })
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
  }

  if (customer.statements.push(statementOperation)) {
    return res.status(201).json({
      msg: `Withdraw ${amount} for ${customer.name}`,
    })
  }
})

app.get('/statements/date', verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req
  const { date } = req.query

  const dateFormat = new Date(date + ' 00:00')

  const statement = customer.statements.filter(
    (statement) =>
      statement.created_at.toDateString() ===
      new Date(dateFormat).toDateString(),
  )

  return res.status(200).json(statement)
})

app.put('/account', verifyIfExistsAccountCPF, (req, res) => {
  const { name } = request.body
  const { customer } = request

  customer.name = name

  return response.status(201).json({
    msg: 'Customer successffully updated',
  })
})

app.delete('/account', verifyIfExistsAccountCPF, (req, res) => {
  const { customer } = req

  // splice
  storage.splice(customer, 1)

  return res.status(204).json(storage)
})

app.listen(3333)
