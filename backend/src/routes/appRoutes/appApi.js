const express = require('express');
const { catchErrors } = require('@/handlers/errorHandlers');
const router = express.Router();

const appControllers = require('@/controllers/appControllers');
const { routesList } = require('@/models/utils');

const routerApp = (entity, controller) => {
  router.route(`/${entity}/create`).post(catchErrors(controller['create']));
  router.route(`/${entity}/read/:id`).get(catchErrors(controller['read']));
  router.route(`/${entity}/update/:id`).patch(catchErrors(controller['update']));
  router.route(`/${entity}/delete/:id`).delete(catchErrors(controller['delete']));
  router.route(`/${entity}/search`).get(catchErrors(controller['search']));
  router.route(`/${entity}/list`).get(catchErrors(controller['list']));
  router.route(`/${entity}/listAll`).get(catchErrors(controller['listAll']));
  router.route(`/${entity}/filter`).get(catchErrors(controller['filter']));
  router.route(`/${entity}/summary`).get(catchErrors(controller['summary']));

  if (entity === 'invoice' || entity === 'quote' || entity === 'payment') {
    router.route(`/${entity}/mail`).post(catchErrors(controller['mail']));
  }

  if (entity === 'quote') {
    router.route(`/${entity}/convert/:id`).get(catchErrors(controller['convert']));
  }

  if (entity === 'invoice' || entity === 'quote' || entity === 'purchaseorder') {
    router.route(`/${entity}/copy/:id`).get(catchErrors(controller['copy']));
  }
};

routesList.forEach(({ entity, controllerName }) => {
  const controller = appControllers[controllerName];
  routerApp(entity, controller);
});

// Add all controllers
const comparisonController = require('@/controllers/appControllers/comparisonController');

// Add all routes
router.route('/comparison/getPurchasePrice').get(comparisonController.getPurchasePrice);
router.route('/comparison/create').post(comparisonController.create);
router.route('/comparison/read/:id').get(comparisonController.read);
router.route('/comparison/update/:id').patch(comparisonController.update);
router.route('/comparison/delete/:id').delete(comparisonController.delete);
router.route('/comparison/search').get(comparisonController.search);
router.route('/comparison/list').get(comparisonController.list);
router.route('/comparison/summary').get(comparisonController.summary);
router.route('/comparison/fullComparison').post(comparisonController.fullComparison);

// 添加价格搜索控制器
const priceSearchController = require('@/controllers/appControllers/priceSearchController');

// 添加价格搜索路由
router.route('/priceSearch/history').post(priceSearchController.searchPriceHistory);

// Ola AI 助手 — 代理转发到 NanoBot serve
const olaController = require('@/controllers/appControllers/olaController');
router.route('/ola/chat').post(catchErrors(olaController['chat']));
router.route('/ola/session/create').post(catchErrors(olaController['sessionCreate']));
router.route('/ola/session/list').get(catchErrors(olaController['sessionList']));
router.route('/ola/session/delete/:id').delete(catchErrors(olaController['sessionDelete']));
router.route('/ola/session/rename/:id').patch(catchErrors(olaController['sessionRename']));
router.route('/ola/session/messages/:id').get(catchErrors(olaController['sessionMessages']));

// Internal developer dashboard — gated by email allowlist (issue #220 D1).
// Routes for individual panels are registered in subsequent items (D3-D8).
const internalAuth = require('@/middlewares/internalAuth');
const internalDashboardController = require('@/controllers/internalDashboardController');
const internalDashboardRouter = express.Router();
router.use('/internal/dashboard', internalAuth, internalDashboardRouter);
internalDashboardRouter.get(
  '/llm-usage',
  catchErrors(internalDashboardController.getLlmUsage)
);
internalDashboardRouter.get(
  '/email-token-usage',
  catchErrors(internalDashboardController.getEmailToken)
);
internalDashboardRouter.get(
  '/users/active',
  catchErrors(internalDashboardController.getUserActivity)
);
internalDashboardRouter.get(
  '/mcp-health',
  catchErrors(internalDashboardController.getMcpHealth)
);

module.exports = router;
