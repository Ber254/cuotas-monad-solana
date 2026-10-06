// Generado por scripts/export-abi.sh — no editar a mano.
export const installmentRegistryAbi = [
  {
    "type": "constructor",
    "inputs": [
      {
        "name": "initialVerifier",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "MAX_INSTALLMENTS",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "createObligation",
    "inputs": [
      {
        "name": "description",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "buyer",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "sellerSolanaAddress",
        "type": "string",
        "internalType": "string"
      },
      {
        "name": "installmentAmount",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "installmentCount",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "firstDueDate",
        "type": "uint64",
        "internalType": "uint64"
      },
      {
        "name": "interval",
        "type": "uint64",
        "internalType": "uint64"
      }
    ],
    "outputs": [
      {
        "name": "obligationId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "getInstallment",
    "inputs": [
      {
        "name": "obligationId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "number",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct InstallmentRegistry.InstallmentView",
        "components": [
          {
            "name": "obligationId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "number",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "dueDate",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "status",
            "type": "uint8",
            "internalType": "enum InstallmentRegistry.InstallmentStatus"
          },
          {
            "name": "paidAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "paymentRef",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "buyer",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "seller",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "creditor",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "creditorSolanaAddress",
            "type": "string",
            "internalType": "string"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getInstallments",
    "inputs": [
      {
        "name": "obligationId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "list",
        "type": "tuple[]",
        "internalType": "struct InstallmentRegistry.InstallmentView[]",
        "components": [
          {
            "name": "obligationId",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "number",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "amount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "dueDate",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "status",
            "type": "uint8",
            "internalType": "enum InstallmentRegistry.InstallmentStatus"
          },
          {
            "name": "paidAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "paymentRef",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "buyer",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "seller",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "creditor",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "creditorSolanaAddress",
            "type": "string",
            "internalType": "string"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getObligation",
    "inputs": [
      {
        "name": "obligationId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "internalType": "struct InstallmentRegistry.Obligation",
        "components": [
          {
            "name": "id",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "description",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "seller",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "buyer",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "sellerSolanaAddress",
            "type": "string",
            "internalType": "string"
          },
          {
            "name": "installmentAmount",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "installmentCount",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "paidCount",
            "type": "uint8",
            "internalType": "uint8"
          },
          {
            "name": "firstDueDate",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "interval",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "createdAt",
            "type": "uint64",
            "internalType": "uint64"
          },
          {
            "name": "status",
            "type": "uint8",
            "internalType": "enum InstallmentRegistry.ObligationStatus"
          }
        ]
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getObligationsByBuyer",
    "inputs": [
      {
        "name": "buyer",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getObligationsByCreditor",
    "inputs": [
      {
        "name": "creditor",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "getObligationsBySeller",
    "inputs": [
      {
        "name": "seller",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256[]",
        "internalType": "uint256[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "markInstallmentPaid",
    "inputs": [
      {
        "name": "obligationId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "number",
        "type": "uint8",
        "internalType": "uint8"
      },
      {
        "name": "paymentRef",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "obligationCount",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "owner",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "setVerifier",
    "inputs": [
      {
        "name": "newVerifier",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "transferInstallments",
    "inputs": [
      {
        "name": "obligationId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "numbers",
        "type": "uint8[]",
        "internalType": "uint8[]"
      },
      {
        "name": "newCreditor",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "newCreditorSolanaAddress",
        "type": "string",
        "internalType": "string"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function",
    "name": "usedPaymentRefs",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "function",
    "name": "verifier",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event",
    "name": "InstallmentPaid",
    "inputs": [
      {
        "name": "obligationId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "number",
        "type": "uint8",
        "indexed": true,
        "internalType": "uint8"
      },
      {
        "name": "paymentRef",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      },
      {
        "name": "markedBy",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "InstallmentTransferred",
    "inputs": [
      {
        "name": "obligationId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "number",
        "type": "uint8",
        "indexed": true,
        "internalType": "uint8"
      },
      {
        "name": "to",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "from",
        "type": "address",
        "indexed": false,
        "internalType": "address"
      },
      {
        "name": "toSolanaAddress",
        "type": "string",
        "indexed": false,
        "internalType": "string"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ObligationCompleted",
    "inputs": [
      {
        "name": "obligationId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "ObligationCreated",
    "inputs": [
      {
        "name": "obligationId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "seller",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "buyer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "installmentAmount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "installmentCount",
        "type": "uint8",
        "indexed": false,
        "internalType": "uint8"
      },
      {
        "name": "firstDueDate",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      },
      {
        "name": "interval",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "type": "event",
    "name": "VerifierChanged",
    "inputs": [
      {
        "name": "previous",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "current",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "type": "error",
    "name": "AlreadyPaid",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InstallmentNotFound",
    "inputs": []
  },
  {
    "type": "error",
    "name": "InvalidParams",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotAuthorized",
    "inputs": []
  },
  {
    "type": "error",
    "name": "NotOwner",
    "inputs": []
  },
  {
    "type": "error",
    "name": "ObligationNotFound",
    "inputs": []
  },
  {
    "type": "error",
    "name": "PaymentRefAlreadyUsed",
    "inputs": []
  }
] as const;
