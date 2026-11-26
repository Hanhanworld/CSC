(function () {
    "use strict";

    var pressureFactors = {
        Pa: 1,
        kPa: 1000,
        MPa: 1000000,
        bar: 100000,
        psi: 6894.757293168,
        "kgf/cm²": 98066.5,
        mmHg: 133.322387415,
        atm: 101325
    };

    function formatNumber(value) {
        return new Intl.NumberFormat("zh-TW", {
            maximumSignificantDigits: 9
        }).format(value);
    }

    function readNumber(element) {
        var value = element.value.trim();
        return value === "" ? NaN : Number(value);
    }

    function initPressureTool() {
        var root = document.querySelector('[data-tool="pressure"]');
        if (!root) return;

        var input = root.querySelector("[data-pressure-value]");
        var from = root.querySelector("[data-pressure-from]");
        var to = root.querySelector("[data-pressure-to]");
        var output = root.querySelector("[data-result]");
        var resultUnit = root.querySelector("[data-result-unit]");
        var note = root.querySelector("[data-result-note]");

        function update() {
            var value = readNumber(input);
            resultUnit.textContent = to.value;

            if (!Number.isFinite(value)) {
                output.textContent = "—";
                note.textContent = "請輸入有效的數值";
                return;
            }

            var converted = value * pressureFactors[from.value] / pressureFactors[to.value];
            output.textContent = formatNumber(converted);
            note.textContent = formatNumber(value) + " " + from.value + " = " +
                formatNumber(converted) + " " + to.value;
        }

        [input, from, to].forEach(function (element) {
            element.addEventListener("input", update);
            element.addEventListener("change", update);
        });

        root.querySelector("[data-swap-units]").addEventListener("click", function () {
            var previousFrom = from.value;
            from.value = to.value;
            to.value = previousFrom;
            update();
        });

        update();
    }

    function initSignalTool() {
        var root = document.querySelector('[data-tool="signal"]');
        if (!root) return;

        var low = root.querySelector("[data-range-low]");
        var high = root.querySelector("[data-range-high]");
        var unitSelect = root.querySelector("[data-range-unit-select]");
        var customUnit = root.querySelector("[data-range-unit-custom]");
        var customUnitRow = root.querySelector("[data-custom-unit-row]");
        var unitLabels = Array.prototype.slice.call(root.querySelectorAll("[data-range-unit-label]"));
        var engineeringInput = root.querySelector("[data-engineering-value]");
        var currentInput = root.querySelector("[data-current-value]");
        var percentInput = root.querySelector("[data-percent-value]");
        var countInput = root.querySelector("[data-count-value]");
        var note = root.querySelector("[data-result-note]");
        var signalSlider = root.querySelector("[data-signal-slider]");
        var engineeringUnits = Array.prototype.slice.call(root.querySelectorAll("[data-engineering-unit]"));

        function getUnit() {
            return unitSelect.value === "custom"
                ? (customUnit.value.trim() || "工程值")
                : unitSelect.value;
        }

        function update(source) {
            var lower = readNumber(low);
            var upper = readNumber(high);
            var displayUnit = getUnit();
            var isCustom = unitSelect.value === "custom";
            customUnitRow.hidden = !isCustom;
            unitLabels.forEach(function (label) {
                label.textContent = displayUnit;
            });
            engineeringUnits.forEach(function (label) {
                label.textContent = displayUnit;
            });

            var validRange = Number.isFinite(lower) && Number.isFinite(upper) && upper > lower;
            signalSlider.disabled = !validRange;
            if (!validRange) {
                note.textContent = Number.isFinite(lower) && Number.isFinite(upper)
                    ? "量程上限必須大於下限"
                    : "請確認輸入的量程數值";
                note.classList.add("is-error");
                signalSlider.style.setProperty("--range-progress", "0%");
                return;
            }

            var sourceInput = source === "current" ? currentInput :
                source === "percent" ? percentInput :
                    source === "count" ? countInput : engineeringInput;
            var enteredValue = readNumber(sourceInput);
            if (!Number.isFinite(enteredValue)) {
                note.textContent = "請輸入有效的數值";
                note.classList.add("is-error");
                return;
            }

            var percent;
            if (source === "current") {
                percent = (enteredValue - 4) / 16 * 100;
            } else if (source === "percent") {
                percent = enteredValue;
            } else if (source === "count") {
                percent = enteredValue / 27648 * 100;
            } else {
                percent = (enteredValue - lower) / (upper - lower) * 100;
            }

            var engineeringValue = lower + percent / 100 * (upper - lower);
            var currentValue = 4 + percent / 100 * 16;
            var rawCount = Math.round(percent * 276.48);
            engineeringInput.value = String(Number(engineeringValue.toPrecision(12)));
            currentInput.value = String(Number(currentValue.toPrecision(12)));
            percentInput.value = String(Number(percent.toPrecision(12)));
            countInput.value = String(rawCount);

            var outOfRange = percent < 0 || percent > 100;
            note.textContent = outOfRange
                ? "超出 4–20 mA 對應量程，顯示線性外插值"
                : "4 mA 對應量程下限 · 20 mA 對應量程上限";
            note.classList.toggle("is-error", outOfRange);

            var clampedPercent = Math.max(0, Math.min(100, percent));
            signalSlider.value = String(Math.round(clampedPercent * 276.48));
            signalSlider.style.setProperty("--range-progress", clampedPercent + "%");
        }

        signalSlider.addEventListener("input", function () {
            countInput.value = signalSlider.value;
            update("count");
        });

        [
            [engineeringInput, "engineering"],
            [currentInput, "current"],
            [percentInput, "percent"],
            [countInput, "count"]
        ].forEach(function (field) {
            field[0].addEventListener("input", function () {
                update(field[1]);
            });
            field[0].addEventListener("change", function () {
                update(field[1]);
            });
        });

        [low, high, unitSelect, customUnit].forEach(function (element) {
            element.addEventListener("input", function () {
                update("engineering");
            });
            element.addEventListener("change", function () {
                update("engineering");
            });
        });

        update("engineering");
    }

    var typeKNegative = [
        0,
        0.0394501280250,
        2.36223735980e-5,
        -3.28589067840e-7,
        -4.99048287770e-9,
        -6.75090591730e-11,
        -5.74103274280e-13,
        -3.10888728940e-15,
        -1.04516093650e-17,
        -1.98892668780e-20,
        -1.63226974860e-23
    ];

    var typeKPositive = [
        -0.0176004136860,
        0.0389212049750,
        1.85587700320e-5,
        -9.94575928740e-8,
        3.18409457190e-10,
        -5.60728448890e-13,
        5.60750590590e-16,
        -3.20207200030e-19,
        9.71511471520e-23,
        -1.21047212750e-26
    ];

    var typeRLow = [
        0,
        5.28961729765e-3,
        1.39166589782e-5,
        -2.38855693017e-8,
        3.56916001063e-11,
        -4.62347666298e-14,
        5.00777441034e-17,
        -3.73105886191e-20,
        1.57716482367e-23,
        -2.81038625251e-27
    ];

    var typeRMiddle = [
        2.95157925316,
        -2.52061251332e-3,
        1.59564501865e-5,
        -7.64085947576e-9,
        2.05305291024e-12,
        -2.93359668173e-16,
        1.93568914177e-20
    ];

    var typeRHigh = [
        152.232118209,
        -0.268819888545,
        1.71280280471e-4,
        -3.45895706453e-8,
        -9.34633971046e-15
    ];

    function polynomial(coefficients, value) {
        return coefficients.reduceRight(function (result, coefficient) {
            return result * value + coefficient;
        }, 0);
    }

    function rtdResistance(temperature, baseResistance) {
        if (temperature < -200 || temperature > 850) return NaN;
        var a = 3.9083e-3;
        var b = -5.775e-7;
        var c = -4.183e-12;
        var resistance = baseResistance * (1 + a * temperature + b * temperature * temperature);
        if (temperature < 0) {
            resistance += baseResistance * c * (temperature - 100) *
                temperature * temperature * temperature;
        }
        return resistance;
    }

    function typeKMillivolts(temperature) {
        if (temperature < -270 || temperature > 1372) return NaN;
        if (temperature < 0) return polynomial(typeKNegative, temperature);
        return polynomial(typeKPositive, temperature) +
            0.1185976 * Math.exp(-0.0001183432 * Math.pow(temperature - 126.9686, 2));
    }

    function typeRMillivolts(temperature) {
        if (temperature < -50 || temperature > 1768.1) return NaN;
        if (temperature < 1064.18) return polynomial(typeRLow, temperature);
        if (temperature < 1664.5) return polynomial(typeRMiddle, temperature);
        return polynomial(typeRHigh, temperature);
    }

    function invertMonotonic(converter, target, min, max) {
        var low = min;
        var high = max;
        for (var i = 0; i < 80; i += 1) {
            var middle = (low + high) / 2;
            if (converter(middle) < target) low = middle;
            else high = middle;
        }
        return (low + high) / 2;
    }

    function temperatureFromSignal(sensor, reading) {
        var limits;
        var converter;
        if (sensor === "pt100") {
            converter = function (temperature) {
                return rtdResistance(temperature, 100);
            };
            limits = [converter(-200), converter(850), -200, 850];
        } else if (sensor === "k") {
            converter = typeKMillivolts;
            limits = [converter(-270), converter(1372), -270, 1372];
        } else {
            converter = typeRMillivolts;
            limits = [converter(-50), converter(1768), -50, 1768];
        }

        // NIST's reference tables round thermocouple EMF to 0.001 mV.
        var tolerance = sensor === "pt100" ? 0 : 0.0005;
        if (reading < limits[0] - tolerance || reading > limits[1] + tolerance) return NaN;
        reading = Math.max(limits[0], Math.min(limits[1], reading));
        return invertMonotonic(converter, reading, limits[2], limits[3]);
    }

    function initTemperatureTool() {
        var root = document.querySelector('[data-tool="temperature"]');
        if (!root) return;

        var temperatureInput = root.querySelector("[data-temperature-value]");
        var temperatureUnit = root.querySelector("[data-temperature-unit]");
        var temperatureInputUnit = root.querySelector("[data-temperature-input-unit]");
        var ptInput = root.querySelector("[data-pt-value]");
        var kInput = root.querySelector("[data-k-value]");
        var rInput = root.querySelector("[data-r-value]");
        var forwardNote = root.querySelector("[data-forward-note]");
        var ptNote = root.querySelector("[data-pt-note]");
        var kNote = root.querySelector("[data-k-note]");
        var rNote = root.querySelector("[data-r-note]");
        var temperatureSlider = root.querySelector("[data-temperature-slider]");
        var sliderLowLabel = root.querySelector("[data-temperature-low-label]");
        var sliderHighLabel = root.querySelector("[data-temperature-high-label]");
        var currentCelsius = getCelsius(readNumber(temperatureInput));

        function getCelsius(value) {
            return temperatureUnit.value === "°F" ? (value - 32) * 5 / 9 : value;
        }

        function formatTemperature(celsius) {
            return temperatureUnit.value === "°F" ? celsius * 9 / 5 + 32 : celsius;
        }

        function setSensorValue(input, note, value) {
            if (Number.isFinite(value)) {
                input.value = String(Number(value.toFixed(4)));
                input.classList.remove("is-error");
                note.textContent = "";
                note.classList.remove("is-error");
                return false;
            }

            input.value = "";
            input.classList.add("is-error");
            note.textContent = "超出標準量程";
            note.classList.add("is-error");
            return true;
        }

        function renderTemperature(celsius) {
            if (Math.abs(celsius) < 1e-10) celsius = 0;
            currentCelsius = celsius;
            var entered = formatTemperature(celsius);
            var minimum = formatTemperature(-270);
            var maximum = formatTemperature(1768.1);
            var sliderValue = Math.max(minimum, Math.min(maximum, entered));
            temperatureInputUnit.textContent = temperatureUnit.value;
            temperatureInput.value = String(Number(entered.toPrecision(12)));

            var resistance = rtdResistance(celsius, 100);
            var kMillivolts = typeKMillivolts(celsius);
            var rMillivolts = typeRMillivolts(celsius);
            var ptOutOfRange = setSensorValue(ptInput, ptNote, resistance);
            var kOutOfRange = setSensorValue(kInput, kNote, kMillivolts);
            var rOutOfRange = setSensorValue(rInput, rNote, rMillivolts);
            var hasOutOfRange = ptOutOfRange || kOutOfRange || rOutOfRange;

            temperatureSlider.min = String(minimum);
            temperatureSlider.max = String(maximum);
            temperatureSlider.value = String(sliderValue);
            temperatureSlider.style.setProperty(
                "--range-progress",
                ((sliderValue - minimum) / (maximum - minimum) * 100) + "%"
            );
            sliderLowLabel.textContent = formatNumber(Number(minimum.toFixed(1))) +
                " " + temperatureUnit.value;
            sliderHighLabel.textContent = formatNumber(Number(maximum.toFixed(1))) +
                " " + temperatureUnit.value;

            forwardNote.textContent = "輸入 " + formatNumber(Number(entered.toFixed(3))) +
                " " + temperatureUnit.value + "（" +
                formatNumber(Number(celsius.toFixed(3))) + " °C）" +
                (hasOutOfRange ? " · 部分感測器超出標準量程" : "");
            forwardNote.classList.remove("is-error");
        }

        function updateFromSignal(input, sensor) {
            var reading = readNumber(input);
            if (!Number.isFinite(reading)) {
                forwardNote.textContent = "請輸入有效的感測器數值";
                forwardNote.classList.add("is-error");
                input.classList.add("is-error");
                return;
            }

            var celsius = temperatureFromSignal(sensor, reading);
            if (!Number.isFinite(celsius)) {
                forwardNote.textContent = "輸入訊號超出標準量程";
                forwardNote.classList.add("is-error");
                input.classList.add("is-error");
                return;
            }

            input.classList.remove("is-error");
            renderTemperature(celsius);
        }

        temperatureInput.addEventListener("input", function () {
            var entered = readNumber(temperatureInput);
            if (!Number.isFinite(entered)) {
                forwardNote.textContent = "請輸入有效溫度";
                forwardNote.classList.add("is-error");
                temperatureInput.classList.add("is-error");
                return;
            }
            temperatureInput.classList.remove("is-error");
            renderTemperature(getCelsius(entered));
        });
        temperatureInput.addEventListener("change", function () {
            var entered = readNumber(temperatureInput);
            if (Number.isFinite(entered)) renderTemperature(getCelsius(entered));
        });

        temperatureSlider.addEventListener("input", function () {
            temperatureInput.value = temperatureSlider.value;
            var entered = readNumber(temperatureInput);
            renderTemperature(getCelsius(entered));
        });

        temperatureUnit.addEventListener("change", function () {
            renderTemperature(currentCelsius);
        });

        [
            [ptInput, "pt100"],
            [kInput, "k"],
            [rInput, "r"]
        ].forEach(function (field) {
            var update = function () {
                updateFromSignal(field[0], field[1]);
            };
            field[0].addEventListener("input", update);
            field[0].addEventListener("change", update);
        });

        renderTemperature(currentCelsius);
    }

    initPressureTool();
    initSignalTool();
    initTemperatureTool();
}());
