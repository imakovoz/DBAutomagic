var gatoken = null;

document.addEventListener("DOMContentLoaded", function(event) {
  var accountEl = document.querySelector("#account");
  var trackerEl = document.querySelector("#tracker");
  var jsonEl = document.querySelector("#json");
  chrome.storage.sync.get(["account"], function(result) {
    console.log(result["json"]);
    if (result["account"] !== undefined || result !== {}) {
      accountEl.value = result["account"];
    }
  });
  chrome.storage.sync.get(["tracker"], function(result) {
    if (result["tracker"] !== undefined) {
      trackerEl.value = result["tracker"];
    }
  });
  chrome.storage.sync.get(["json"], function(result) {
    if (result["json"] !== undefined) {
      jsonEl.value = result["json"];
    }
  });
  accountEl.addEventListener("change", e => {
    chrome.storage.sync.set({ account: e.currentTarget.value }, function() {
      console.log("Account Value is set to " + value);
    });
  });
  trackerEl.addEventListener("change", e => {
    chrome.storage.sync.set({ tracker: e.currentTarget.value }, function() {
      console.log("Tracker Value is set to " + value);
    });
  });
  jsonEl.addEventListener("change", e => {
    chrome.storage.sync.set({ json: e.currentTarget.value }, function() {
      console.log("JSON Value is set to " + value);
    });
  });

  var submit = document.getElementById("submit");
  submit.onclick = function(e) {
    e.preventDefault();
    var account = document.querySelector("#account").value;
    var tracker = document.querySelector("#tracker").value;
    var json = document.querySelector("#json").value;

    if (account === "") {
      account = "124154600";
    }
    if (tracker === "") {
      tracker = "UA-124154600-7";
    }
    if (json === "") {
      json = {
        "1": "demandbase_sid",
        "2": "company_name",
        "3": "industry",
        "4": "sub_industry",
        "5": "employee_range",
        "6": "revenue_range",
        "7": "audience",
        "8": "audience_segment",
        "9": "marketing_alias",
        "10": "city",
        "11": "state",
        "12": "country_name",
        "13": "watch_list_account_type",
        "14": "watch_list_account_status",
        "15": "watch_list_campaign_code",
        "16": "watch_list_account_owner"
      };
    } else {
      json = JSON.parse(json);
    }
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
    alert("submitted1");
    chrome.identity.getAuthToken(
      {
        interactive: true
      },
      function(token) {
        alert(`token: ${token}`);
        console.log(token);
        gatoken = token;
        if (chrome.runtime.lastError) {
          alert(chrome.runtime.lastError.message);
          return;
        }

        // request auth token
        var x = new XMLHttpRequest();
        x.open(
          "GET",
          "https://www.googleapis.com/analytics/v3/management/accounts/" +
            account +
            "/webproperties/" +
            tracker +
            "/customDimensions?alt=json&access_token=" +
            token
        );
        // call back function once authenticated
        x.onload = () => {
          let list = {};
          var indexes = [];

          JSON.parse(x.response)["items"].forEach(item => {
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
            if (indexes.filter(j => j == keys[0]).length > 0) {
              // if updating
              var k = new XMLHttpRequest();
              k.open(
                "PATCH",
                `https://www.googleapis.com/analytics/v3/management/accounts/${account}/webproperties/${tracker}/customDimensions/ga:dimension${
                  keys[0]
                }?alt=json&access_token=${token}`
              );
            } else {
              // if inserting
              var k = new XMLHttpRequest();
              k.open(
                "POST",
                "https://www.googleapis.com/analytics/v3/management/accounts/" +
                  account +
                  "/webproperties/" +
                  tracker +
                  "/customDimensions?alt=json&access_token=" +
                  token
              );
            }
            var body = {
              name: json[keys[0]],
              index: keys[0],
              scope: "SESSION",
              active: true
            };
            k.setRequestHeader(
              "Content-Type",
              "application/json;charset=UTF-8"
            );

            k.onload = () => {
              if (keys.length > 1) {
                keys = keys.slice(1);
                wait(2000);
                cbFunc();
              } else {
                alert("Done");
              }
            };
            k.onreadystatechange = function(oEvent) {
              if (k.readyState === 4) {
                if (k.status === 200) {
                  console.log(k.responseText);
                } else {
                  alert(JSON.parse(k.responseText)["error"]["message"]);
                  // debugger;
                  // alert("Error", k.statusText);
                }
              }
            };
            k.send(JSON.stringify(body));
          };
          cbFunc();
        };
        // send request
        x.send();
      }
    );
  };

  var logout = document.getElementById("logout");
  logout.onclick = function(e) {
    e.preventDefault();
    var options = {
      interactive: true,
      url: "https://localhost:44344/Account/Logout"
    };
    chrome.identity.launchWebAuthFlow(options, function(redirectUri) {});

    options = {
      interactive: true,
      url: "https://accounts.google.com/logout"
    };
    chrome.identity.launchWebAuthFlow(options, function(redirectUri) {});
  };
});
function wait(ms) {
  var start = new Date().getTime();
  var end = start;
  while (end < start + ms) {
    end = new Date().getTime();
  }
}
