document.addEventListener("DOMContentLoaded", event => {
  var accountEl = document.querySelector("#account");
  var trackerEl = document.querySelector("#tracker");
  var jsonEl = document.querySelector("#json");
  var type = document.getElementById("type");

  chrome.storage.local.get(["tracker"], function(result) {
    if (result["tracker"] !== undefined) {
      trackerEl.value = result["tracker"];
    }
  });
  chrome.storage.local.get(["json"], function(result) {
    if (result["json"] !== undefined) {
      jsonEl.value = result["json"];
    }
  });

  trackerEl.addEventListener("change", e => {
    chrome.storage.local.set({ tracker: e.currentTarget.value }, function() {
      // console.log("Tracker Value is set");
    });
  });
  jsonEl.addEventListener("change", e => {
    chrome.storage.local.set({ json: e.currentTarget.value }, function() {
      // console.log("JSON Value is set");
    });
  });

  var pullDims = document.getElementById("pullDims");
  pullDims.onclick = e => {
    e.preventDefault();

    var tracker = document.querySelector("#tracker").value;
    var account = tracker.split("-")[1];
    var errorArr = [];
    if (account === "") {
      errorArr.push("Account field is empty");
    }
    if (tracker === "") {
      errorArr.push("Tracker field is empty");
    }

    if (errorArr.length > 0) {
      alert(errorArr.join("\n"));
    } else {
      var keys = Object.keys(json);
      // sanitize inputs
      keys.forEach(key => {
        json[key] = json[key]
          .split("_")
          .map(wrd => {
            if (wrd === "sid") {
              return "SID";
            } else if (wrd === "sic") {
              return "SIC";
            } else if (wrd === "naics") {
              return "NAICS";
            } else {
              return wrd.charAt(0).toUpperCase() + wrd.slice(1);
            }
          })
          .join(" ");
      });

      chrome.identity.getAuthToken(
        {
          interactive: true
        },
        token => {
          if (chrome.runtime.lastError) {
            alert(chrome.runtime.lastError.message);
            return;
          }

          var accountReq = new XMLHttpRequest();
          var accountName = "";
          accountReq.open(
            "GET",
            "https://www.googleapis.com/analytics/v3/management/accounts/" +
              account +
              "/webproperties/" +
              tracker +
              "?alt=json&access_token=" +
              token
          );
          accountReq.onload = () => {
            if (JSON.parse(accountReq.response)["error"] !== undefined) {
              alert(JSON.parse(accountReq.response)["error"]["message"]);
            } else {
              accountName = JSON.parse(accountReq.response)["name"];
            }
          };
          accountReq.send();

          // request auth token
          var authReq = new XMLHttpRequest();
          authReq.open(
            "GET",
            "https://www.googleapis.com/analytics/v3/management/accounts/" +
              account +
              "/webproperties/" +
              tracker +
              "/customDimensions?alt=json&access_token=" +
              token
          );
          // call back function once authenticated
          authReq.onload = () => {
            if (JSON.parse(authReq.response)["error"] !== undefined) {
              alert(JSON.parse(authReq.response)["error"]["message"]);
            } else {
              let list = {};
              var indexes = [];
              // confirm(JSON.parse(authReq.response)["username"]);

              var availableDims = `Property Name: ${accountName}`;
              JSON.stringify(
                JSON.parse(authReq.response)["items"].forEach(entry => {
                  availableDims += `\n${entry.index} : ${entry.name}`;
                })
              );
              alert(availableDims);
            }
          };
          authReq.send();
        }
      );
    }
  };

  var submit = document.getElementById("submit");
  submit.onclick = e => {
    e.preventDefault();
    var scope = document.getElementById("scope");
    scope = scope.options[scope.selectedIndex].value.toUpperCase();
    type = type.options[type.selectedIndex].value;
    var active = document.getElementById("active");
    active = active.options[active.selectedIndex].value;
    if (active === "true") {
      active = true;
    } else {
      active = false;
    }

    var tracker = document.querySelector("#tracker").value;
    var account = tracker.split("-")[1];
    var json = document.querySelector("#json").value;
    var errorArr = [];
    if (account === "") {
      errorArr.push("Account field is empty");
    }
    if (tracker === "") {
      errorArr.push("Tracker field is empty");
    }
    if (json === "") {
      errorArr.push("JSON field is empty");
    } else {
      json = JSON.parse(json);
    }

    if (errorArr.length > 0) {
      alert(errorArr.join("\n"));
    } else {
      var keys = Object.keys(json);
      // sanitize inputs
      keys.forEach(key => {
        json[key] = json[key]
          .split("_")
          .map(wrd => {
            if (wrd === "sid") {
              return "SID";
            } else if (wrd === "sic") {
              return "SIC";
            } else if (wrd === "naics") {
              return "NAICS";
            } else {
              return wrd.charAt(0).toUpperCase() + wrd.slice(1);
            }
          })
          .join(" ");
      });

      chrome.identity.getAuthToken(
        {
          interactive: true
        },
        token => {
          if (chrome.runtime.lastError) {
            alert(chrome.runtime.lastError.message);
            return;
          }

          // request auth token
          var authReq = new XMLHttpRequest();
          if (type === "dimensions") {
            authReq.open(
              "GET",
              "https://www.googleapis.com/analytics/v3/management/accounts/" +
                account +
                "/webproperties/" +
                tracker +
                "/customDimensions?alt=json&access_token=" +
                token
            );
          } else {
            authReq.open(
              "GET",
              "https://www.googleapis.com/analytics/v3/management/accounts/" +
                account +
                "/webproperties/" +
                tracker +
                "/customMetrics?alt=json&access_token=" +
                token
            );
          }
          // call back function once authenticated
          authReq.onload = () => {
            if (JSON.parse(authReq.response)["error"] !== undefined) {
              alert(JSON.parse(authReq.response)["error"]["message"]);
            } else {
              let list = {};
              var indexes = [];
              // confirm(JSON.parse(authReq.response)["username"]);

              var availableDims = "";
              JSON.stringify(
                JSON.parse(authReq.response)["items"].forEach(entry => {
                  availableDims += `\n${entry.index} : ${entry.name}`;
                })
              );
              alert(availableDims);
              JSON.parse(authReq.response)["items"].forEach(item => {
                list[item["index"]] = item["name"];
                indexes.push(item["index"]);
              });

              // determine if there are any gaps
              const max = Math.max(...keys.map(x => parseInt(x)));
              let arr = keys
                .concat(indexes)
                .map(x => parseInt(x))
                .filter((v, i, a) => a.indexOf(v) === i)
                .sort((a, b) => {
                  return a - b;
                });

              for (var j = 0; j < max; j++) {
                if (arr[j] !== j + 1) {
                  arr.splice(j, 0, j + 1);
                  list[j + 1] = "placeholder";
                }
              }

              keys = keys.map(z => parseInt(z));
              var cbFunc = () => {
                var body = null;
                var dimReq = new XMLHttpRequest();
                if (type === "dimensions") {
                  if (indexes.filter(j => j == keys[0]).length > 0) {
                    // if updating
                    dimReq.open(
                      "PATCH",
                      `https://www.googleapis.com/analytics/v3/management/accounts/${account}/webproperties/${tracker}/customDimensions/ga:dimension${
                        keys[0]
                      }?alt=json&access_token=${token}`
                    );
                  } else {
                    // if inserting
                    dimReq.open(
                      "POST",
                      "https://www.googleapis.com/analytics/v3/management/accounts/" +
                        account +
                        "/webproperties/" +
                        tracker +
                        "/customDimensions?alt=json&access_token=" +
                        token
                    );
                  }
                  body = {
                    name: json[keys[0]],
                    index: keys[0],
                    scope: scope,
                    active: active
                  };
                } else {
                  if (indexes.filter(j => j == keys[0]).length > 0) {
                    // if updating
                    dimReq.open(
                      "PATCH",
                      `https://www.googleapis.com/analytics/v3/management/accounts/${account}/webproperties/${tracker}/customMetrics/ga:metric${
                        keys[0]
                      }?alt=json&access_token=${token}`
                    );
                  } else {
                    // if inserting
                    dimReq.open(
                      "POST",
                      "https://www.googleapis.com/analytics/v3/management/accounts/" +
                        account +
                        "/webproperties/" +
                        tracker +
                        "/customMetrics?alt=json&access_token=" +
                        token
                    );
                  }
                  var njson = JSON.parse(json[keys[0]].replaceAll("'", '"'));
                  body = {
                    active: active
                  };

                  try {
                    body.name = njson["name"];
                  } catch {}
                  try {
                    body.min_value = njson["min"];
                  } catch {}
                  try {
                    body.max_value = njson["max"];
                  } catch {}
                  try {
                    body.type = njson["type"].toUpperCase();
                  } catch {}
                  try {
                    body.scope = njson["scope"];
                  } catch {}
                }

                dimReq.setRequestHeader(
                  "Content-Type",
                  "application/json;charset=UTF-8"
                );

                // add call back function and wait two seconds to avoid api limits
                dimReq.onload = () => {
                  if (keys.length > 1) {
                    // remove first leading to base case
                    keys = keys.slice(1);
                    wait(2000);
                    cbFunc();
                  } else {
                    // recursive call back base case
                    alert("Done");
                  }
                };
                // error handling
                dimReq.onreadystatechange = oEvent => {
                  if (dimReq.readyState === 4 && dimReq.status >= 400) {
                    alert(JSON.parse(dimReq.responseText)["error"]["message"]);
                  }
                };
                dimReq.send(JSON.stringify(body));
              };
              cbFunc();
            }
          };
          authReq.send();
        }
      );
    }
  };
  // this code displays logout screen but doesn't actually log user out, debugging needed
  // var logout = document.getElementById("logout");
  // logout.onclick = e => {
  //   e.preventDefault();
  //   var options = {
  //     interactive: true,
  //     url: "https://localhost:44344/Account/Logout"
  //   };
  //   chrome.identity.launchWebAuthFlow(options, redirectUri => {});
  //
  //   options = {
  //     interactive: true,
  //     url: "https://accounts.google.com/logout"
  //   };
  //   chrome.identity.launchWebAuthFlow(options, redirectUri => {});
  // };
});

function wait(ms) {
  var start = new Date().getTime();
  var end = start;
  while (end < start + ms) {
    end = new Date().getTime();
  }
}

String.prototype.replaceAll = function(search, replacement) {
  var target = this;
  return target.replace(new RegExp(search, "g"), replacement);
};
