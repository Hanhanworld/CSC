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
        var processGroup = root.querySelector("[data-process-group]");
        var currentGroup = root.querySelector("[data-current-group]");
        var processInput = root.querySelector("[data-process-value]");
        var currentInput = root.querySelector("[data-current-value]");
        var output = root.querySelector("[data-result]");
        var resultUnit = root.querySelector("[data-result-unit]");
        var note = root.querySelector("[data-result-note]");
        var meterFill = root.querySelector("[data-meter-fill]");
        var modeButtons = Array.prototype.slice.call(root.querySelectorAll("[data-mode-button]"));
        var mode = "process";

        function getUnit() {
            return unitSelect.value === "custom"
                ? (customUnit.value.trim() || "工程值")
                : unitSelect.value;
        }

        function setMode(nextMode) {
            mode = nextMode;
            var processMode = mode === "process";
            processGroup.hidden = !processMode;
            currentGroup.hidden = processMode;
            modeButtons.forEach(function (button) {
                button.setAttribute("aria-pressed", String(button.dataset.modeButton === mode));
            });
            update();
        }

        function update() {
            var lower = readNumber(low);
            var upper = readNumber(high);
            var value = readNumber(mode === "process" ? processInput : currentInput);
            var displayUnit = getUnit();
            var isCustom = unitSelect.value === "custom";
            customUnitRow.hidden = !isCustom;
            unitLabels.forEach(function (label) {
                label.textContent = displayUnit;
            });
            var invalid = !Number.isFinite(lower) || !Number.isFinite(upper) ||
                !Number.isFinite(value) || upper <= lower;

            resultUnit.textContent = mode === "process" ? "mA" : displayUnit;
            output.classList.toggle("is-error", invalid);

            if (invalid) {
                output.textContent = "—";
                note.textContent = upper <= lower && Number.isFinite(lower) && Number.isFinite(upper)
                    ? "量程上限必須大於下限"
                    : "請確認輸入的數值";
                note.classList.add("is-error");
                meterFill.style.width = "0%";
                return;
            }

            note.classList.remove("is-error");
            var percent;
            var result;
            var outOfRange;

            if (mode === "process") {
                percent = (value - lower) / (upper - lower) * 100;
                result = 4 + percent / 100 * 16;
                outOfRange = percent < 0 || percent > 100;
                note.textContent = formatNumber(percent) + "% 量程 · " +
                    formatNumber(Math.round(percent * 276.48)) + " / 27,648 counts" +
                    (outOfRange ? " · 超出設定量程，顯示線性外插值" : "");
            } else {
                percent = (value - 4) / 16 * 100;
                result = lower + percent / 100 * (upper - lower);
                outOfRange = value < 4 || value > 20;
                note.textContent = formatNumber(percent) + "% 量程 · " +
                    formatNumber(Math.round(percent * 276.48)) + " / 27,648 counts" +
                    (outOfRange ? " · 電流超出 4–20 mA 範圍，顯示線性外插值" : "");
            }

            output.textContent = formatNumber(result);
            meterFill.style.width = Math.max(0, Math.min(100, percent)) + "%";
        }

        modeButtons.forEach(function (button) {
            button.addEventListener("click", function () {
                setMode(button.dataset.modeButton);
            });
        });

        [low, high, unitSelect, customUnit, processInput, currentInput].forEach(function (element) {
            element.addEventListener("input", update);
            element.addEventListener("change", update);
        });

        setMode(mode);
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
        if (sensor === "pt100" || sensor === "pt1000") {
            var baseResistance = sensor === "pt1000" ? 1000 : 100;
            converter = function (temperature) {
                return rtdResistance(temperature, baseResistance);
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
        var tolerance = sensor === "pt100" || sensor === "pt1000" ? 0 : 0.0005;
        if (reading < limits[0] - tolerance || reading > limits[1] + tolerance) return NaN;
        reading = Math.max(limits[0], Math.min(limits[1], reading));
        return invertMonotonic(converter, reading, limits[2], limits[3]);
    }

    function initTemperatureTool() {
        var root = document.querySelector('[data-tool="temperature"]');
        if (!root) return;

        var modeButtons = Array.prototype.slice.call(root.querySelectorAll("[data-temperature-mode]"));
        var forwardGroup = root.querySelector("[data-temperature-forward]");
        var reverseGroup = root.querySelector("[data-temperature-reverse]");
        var temperatureInput = root.querySelector("[data-temperature-value]");
        var temperatureUnit = root.querySelector("[data-temperature-unit]");
        var temperatureInputUnit = root.querySelector("[data-temperature-input-unit]");
        var rtdType = root.querySelector("[data-rtd-type]");
        var sensorType = root.querySelector("[data-sensor-type]");
        var sensorInput = root.querySelector("[data-sensor-value]");
        var sensorUnit = root.querySelector("[data-sensor-unit]");
        var reverseResult = root.querySelector("[data-temperature-result]");
        var reverseResultUnit = root.querySelector("[data-temperature-result-unit]");
        var reverseNote = root.querySelector("[data-temperature-result-note]");
        var rtdOutput = root.querySelector("[data-pt-output]");
        var rtdOutputLabel = root.querySelector("[data-pt-label]");
        var kOutput = root.querySelector("[data-k-output]");
        var rOutput = root.querySelector("[data-r-output]");
        var forwardNote = root.querySelector("[data-forward-note]");
        var mode = "forward";

        function getCelsius(value) {
            return temperatureUnit.value === "°F" ? (value - 32) * 5 / 9 : value;
        }

        function formatTemperature(celsius) {
            return temperatureUnit.value === "°F" ? celsius * 9 / 5 + 32 : celsius;
        }

        function getSensorLabel() {
            return sensorType.options[sensorType.selectedIndex].text;
        }

        function setMode(nextMode) {
            mode = nextMode;
            forwardGroup.hidden = mode !== "forward";
            reverseGroup.hidden = mode !== "reverse";
            modeButtons.forEach(function (button) {
                button.setAttribute("aria-pressed", String(button.dataset.temperatureMode === mode));
            });
            update();
        }

        function updateForward() {
            var entered = readNumber(temperatureInput);
            var celsius = Number.isFinite(entered) ? getCelsius(entered) : NaN;
            var r0 = Number(rtdType.value);
            temperatureInputUnit.textContent = temperatureUnit.value;
            rtdOutputLabel.textContent = rtdType.options[rtdType.selectedIndex].text;

            if (!Number.isFinite(celsius)) {
                rtdOutput.textContent = "—";
                kOutput.textContent = "—";
                rOutput.textContent = "—";
                forwardNote.textContent = "請輸入有效溫度";
                return;
            }

            var resistance = rtdResistance(celsius, r0);
            var kMillivolts = typeKMillivolts(celsius);
            var rMillivolts = typeRMillivolts(celsius);
            rtdOutput.textContent = Number.isFinite(resistance)
                ? formatNumber(Number(resistance.toFixed(4))) : "超量程";
            kOutput.textContent = Number.isFinite(kMillivolts)
                ? formatNumber(Number(kMillivolts.toFixed(4))) : "超量程";
            rOutput.textContent = Number.isFinite(rMillivolts)
                ? formatNumber(Number(rMillivolts.toFixed(4))) : "超量程";
            forwardNote.textContent = "輸入 " + formatNumber(entered) + " °" +
                temperatureUnit.value.replace("°", "") + "（" +
                formatNumber(Number(celsius.toFixed(3))) + " °C）";
        }

        function updateReverse() {
            var reading = readNumber(sensorInput);
            var label = getSensorLabel();
            sensorUnit.textContent = sensorType.value.indexOf("pt") === 0 ? "Ω" : "mV";
            reverseResultUnit.textContent = temperatureUnit.value;

            if (!Number.isFinite(reading)) {
                reverseResult.textContent = "—";
                reverseNote.textContent = "請輸入有效的感測器數值";
                reverseNote.classList.add("is-error");
                return;
            }

            var celsius = temperatureFromSignal(sensorType.value, reading);
            if (!Number.isFinite(celsius)) {
                reverseResult.textContent = "—";
                reverseNote.textContent = label + " 數值超出標準量程";
                reverseNote.classList.add("is-error");
                return;
            }

            var result = formatTemperature(celsius);
            reverseResult.textContent = formatNumber(Number(result.toFixed(3)));
            reverseNote.textContent = label + " 換算 · " +
                formatNumber(Number(celsius.toFixed(3))) + " °C";
            reverseNote.classList.remove("is-error");
        }

        function update() {
            if (mode === "forward") updateForward();
            else updateReverse();
        }

        modeButtons.forEach(function (button) {
            button.addEventListener("click", function () {
                setMode(button.dataset.temperatureMode);
            });
        });

        [temperatureInput, temperatureUnit, rtdType, sensorType, sensorInput].forEach(function (element) {
            element.addEventListener("input", update);
            element.addEventListener("change", update);
        });

        setMode(mode);
    }

    initPressureTool();
    initSignalTool();
    initTemperatureTool();
}());
