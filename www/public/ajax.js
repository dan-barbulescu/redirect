$(function() {
  $("#main.loading").hide();
  $("#loader.action").hide();
  $("#result").hide();
});

function pageReady() {
  $("#loader").fadeOut(250, function() {
    $("#main").fadeIn(250);
  }); 
}

function startAction(action) {
  $("#main").fadeOut(250, function() {
    $("#loader").fadeIn(250, action);
  }); 
}

function actionResult() {
  $("#loader").fadeOut(250, function() {
    $("#result").fadeIn(250);
  });
}

function postJson(path, send, callback) {
  $.ajax({
    type: "POST",
    url: path,
    data: send,
    dataType: "json",
    contentType : "application/json",
    success: callback
  });
}

function getJson(path, callback) {
  $.ajax({
    type: "GET",
    url: path,
    dataType: "json",
    success: callback
  });
}