document.addEventListener("DOMContentLoaded", function(event) {
  var submit = document.getElementById("submit");
  submit.onclick = function(e) {
    e.preventDefault();
    var account = "124154600";
    var tracker = "UA-124154600-4";
    // var account = document.querySelector("#account").value;
    // var tracker = document.querySelector("#tracker").value;
    var json = JSON.parse(document.querySelector("#json").value);
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
      function(token) {
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
        x.onload = function() {
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
          for (var i = 0; i < keys.length; i++) {
            if (indexes.filter(j => j == keys[i]).length > 0) {
              var k = new XMLHttpRequest();
              k.open(
                "PATCH",
                "https://www.googleapis.com/analytics/v3/management/accounts/" +
                  account +
                  "/webproperties/" +
                  tracker +
                  "/customDimensions/" +
                  `ga:dimension${keys[i]}` +
                  "?alt=json&access_token=" +
                  token
              );
              var body = {
                name: json[keys[i]],
                index: keys[i],
                scope: "SESSION",
                active: true
              };
              debugger;
              k.send(body);
            } else {
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
              var body = {
                name: json[keys[i]],
                kind: "analytics#customDimension",
                index: keys[i],
                scope: "SESSION",
                active: true,
                accountId: account,
                webPropertyId: tracker
              };
              debugger;
              k.send(body);
            }
          }
        };
        // send request
        x.send();
      }
    );
  };
});
