// Este objeto relaciona el número de suite con su categoría y precio
const SUITES_DATA = {
  VerdeSuiteGold: {
    precio: 2000, // 
    price_id: "price_1SpNDMRqCWGV92H13HcruvZI", // Lo sacarás de Stripe
    numeros: [350, 332, 330, 326, 324, 316, 314, 312, 308, 306, 304, 302, 301, 305, 307, 309, 378]
  },
  AmarilloSuitePremium: {
    precio: 4000,
    price_id: 'price_1SpE7RRqCWGV92H1zFtEAIV8',
    numeros: [372, 315]
  },
  NaranjaSuiteElite: {
    precio: 2000,
    price_id: 'price_1SpE8jRqCWGV92H15LcZijgJ',
    numeros: [317, 321, 325, 357, 364]
  },
  BlancoSuiteMaster: {
    precio: 4000,
    price_id: 'price_1SpE9CRqCWGV92H11K5sXLV2',
    numeros: [348, 346, 344, 342, 340, 338, 336, 334, 328, 322, 320, 318, 310, 303, 329, 331, 349, 351, 353, 355, 367, 369, 371, 373, 375, 377, 376, 374, 362, 360, 356, 354, 352]
  },
  RojoSuiteDiamond: {
    precio: 6000,
    price_id: 'price_1SpE9TRqCWGV92H1eDu9QTAj',
    numeros: [365, 358]
  }
};

export default SUITES_DATA;