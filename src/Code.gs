function doGet(e) {
  const page = e.parameter.page || 'login';

  if (page === 'login') {
    return HtmlService.createHtmlOutputFromFile('src/ui/Login')
      .setTitle(CONFIG.SYSTEM_NAME)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  if (page === 'dashboard') {
    return HtmlService.createHtmlOutputFromFile('src/ui/Dashboard')
      .setTitle(CONFIG.SYSTEM_NAME)
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  return HtmlService.createHtmlOutput('<h3>Page not found.</h3>');
}

function getDashboardUrl() {
  return ScriptApp.getService().getUrl() + '?page=dashboard';
}
