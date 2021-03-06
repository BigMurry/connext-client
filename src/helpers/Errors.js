export class VCCloseError extends Error {
  constructor (...args) {
    // [methodName, statusCode, message]
    super(args)
    this.name = 'ChannelCloseError'
    if (args.length === 3) {
      this.methodName = args[0]
      this.statusCode = args[1]
      this.message = `[${args[1]}: ${args[0]}] ${args[2]}`
    } else if (args.length == 2) {
      this.methodName = args[0]
      this.statusCode = 650
      this.message = `[${this.statusCode}: ${args[0]}] ${args[1]}`
    }
    Error.captureStackTrace(this, VCCloseError)
  }
}

export class LCCloseError extends Error {
  constructor (...args) {
    // [methodName, statusCode, message]
    super(args)
    this.name = 'ChannelCloseError'
    if (args.length === 3) {
      this.methodName = args[0]
      this.statusCode = args[1]
      this.message = `[${args[1]}: ${args[0]}] ${args[2]}`
    } else if (args.length == 2) {
      this.methodName = args[0]
      this.statusCode = 600
      this.message = `[${this.statusCode}: ${args[0]}] ${args[1]}`
    }
    Error.captureStackTrace(this, LCCloseError)
  }
}

export class VCUpdateError extends Error {
  constructor (...args) {
    // [methodName, statusCode, message]
    super(args)
    this.name = 'UpdateStateError'
    if (args.length === 3) {
      this.methodName = args[0]
      this.statusCode = args[1]
      this.message = `[${args[1]}: ${args[0]}] ${args[2]}`
    } else if (args.length == 2) {
      this.methodName = args[0]
      this.statusCode = 550
      this.message = `[${this.statusCode}: ${args[0]}] ${args[1]}`
    }
    Error.captureStackTrace(this, VCUpdateError)
  }
}

export class LCUpdateError extends Error {
  constructor (...args) {
    // [methodName, statusCode, message]
    super(args)
    this.name = 'UpdateStateError'
    if (args.length === 3) {
      this.methodName = args[0]
      this.statusCode = args[1]
      this.message = `[${args[1]}: ${args[0]}] ${args[2]}`
    } else if (args.length == 2) {
      this.methodName = args[0]
      this.statusCode = 500
      this.message = `[${this.statusCode}: ${args[0]}] ${args[1]}`
    }
    Error.captureStackTrace(this, LCUpdateError)
  }
}

export class VCOpenError extends Error {
  constructor (...args) {
    // [methodName, statusCode, message]
    super(args)
    this.name = 'ChannelOpenError'
    this.methodName = args[0]
    if (args.length === 3) {
      this.statusCode = args[1]
      this.message = `[${args[1]}: ${args[0]}] ${args[2]}`
    } else if (args.length == 2) {
      this.statusCode = 450
      this.message = `[${this.statusCode}: ${args[0]}] ${args[1]}`
    }
    Error.captureStackTrace(this, VCOpenError)
  }
}

export class LCOpenError extends Error {
  constructor (...args) {
    // [methodName, statusCode, message]
    super(args)
    this.name = 'ChannelOpenError'
    if (args.length === 3) {
      this.methodName = args[0]
      this.statusCode = args[1]
      this.message = `[${args[1]}: ${args[0]}] ${args[2]}`
    } else if (args.length == 2) {
      this.methodName = args[0]
      this.statusCode = 400
      this.message = `[${this.statusCode}: ${args[0]}] ${args[1]}`
    }
    Error.captureStackTrace(this, LCOpenError)
  }
}

export class ContractError extends Error {
  constructor (...args) {
    super(...args)
    this.name = this.constructor.name
    this.methodName = args[0]
    if (args.length === 4) {
      // [methodName, statusCode, transactionHash, message]
      this.statusCode = args[1]
      this.transactionHash = args[2]
      this.message = `[${args[1]}: ${args[0]}] ${args[3]}. Tx: ${args[2]}`
    } else if (args.length === 3) {
      // [methodName, statusCode, message]
      this.statusCode = args[1]
      this.transactionHash = args[2]
      this.message = `[${args[1]}: ${args[0]}] ${args[2]}`
    } else if (args.length === 2) {
      // [methodName, message]
      this.statusCode = 300
      this.message = `[${this.statusCode}: ${args[0]}] ${args[1]}`
    }
  }
}

export class ParameterValidationError extends Error {
  constructor (...args) {
    // [methodName, variableName, validatorResponse]
    super(...args)
    this.name = this.constructor.name
    this.statusCode = 200
    this.methodName = args[0]
    this.variableName = args[1]
    this.message = `[${args[0]}][${args[1]}] : ${args[2]}`
    Error.captureStackTrace(this, ParameterValidationError)
  }
}
