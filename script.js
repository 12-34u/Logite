document.addEventListener('DOMContentLoaded', function () {
    const gridContainer = document.getElementById('grid-container');
    const undoButton = document.getElementById('undoButton');
    const clearButton = document.getElementById('clearButton');
    const svgContainer = document.getElementById('flowline-svg');
    const inputSwitchButton = document.getElementById('inputSwitchButton');
    const saveBtn = document.getElementById("saveCircuitButton");
    const loadBtn = document.getElementById("loadCircuitButton");
    const pendingConnections = [];

    // 🔐 Fetch user's email from localStorage (set it after login)
    function getLoggedInEmail() {
    return localStorage.getItem("userEmail");
    }
    
    saveBtn.addEventListener("click", saveCircuit);
    loadBtn.addEventListener("click", loadCircuit);

    let selectedGate = null;
    let outputSelected = false;
    let outputPosition = null;
    let selectedOutputPoint = null;
    let placingInputSwitch = false;
    let placingOutputTerminal = false;
    let placedGates = [];
    let drawnLines = [];
    let connections = [];
    let graph = [];
    let undoStack = [];

    const gateButtons = {
        xorGate: 'images/xor.PNG',
        andGate: 'images/and.PNG',
        orGate: 'images/or.PNG',
        notGate: 'images/not.PNG',
        nandGate: 'images/nand.PNG',
        norGate: 'images/nor.PNG'
    };

    const toggleSwitchImage1 = "images/off.PNG";
    const toggleSwitchImage2 = 'images/on.PNG';
    const outputTerminalImage1 = "images/0out.PNG";
    const outputTerminalImage2 = 'images/1out.PNG';

    
    class Node {
        constructor(type, id) {
            this.type = type;
            this.id = id;
            this.inputs = [];
            this.outputs = [];
            this.isOn = false;
        }

        
        addInput(node) {
            this.inputs.push(node);
            console.log(`Node ${this.id} connected to input node ${node.id}`);
        }

        
        addOutput(node) {
            this.outputs.push(node);
            console.log(`Node ${this.id} connected to output node ${node.id}`);
        }

       
        evaluate() {
            let inputValues = this.inputs.map(inputNode => inputNode.isOn ? 1 : 0);
        
            switch (this.type) {
                case 'not':
                    this.isOn = this.inputs.length > 0 ? !this.inputs[0].isOn : false;
                    break;
                case 'and':
                    this.isOn = inputValues.every(val => val === 1);
                    break;
                case 'or':
                    this.isOn = inputValues.some(val => val === 1);
                    break;
                case 'nand':
                    this.isOn = !inputValues.every(val => val === 1);
                    break;
                case 'nor':
                    this.isOn = !inputValues.some(val => val === 1);
                    break;
                case 'xor':
                    this.isOn = inputValues.reduce((acc, val) => acc ^ val, 0);
                    break;
                case 'output':
                    this.isOn = this.inputs.length > 0 ? this.inputs[0].isOn : false;
                    this.updateOutputImage();
                    break;
            }
        
            console.log(`Node ${this.id} (${this.type}) evaluated: ${this.isOn ? 'On' : 'Off'}`);
            this.propagate();
        }

        
        propagate() {
            this.outputs.forEach(outputNode => {
                console.log(`Node ${this.id} (${this.type}) is propagating its state to Node ${outputNode.id} (${outputNode.type})`);
                outputNode.evaluate();
            });
        }

        
        updateOutputImage() {
            const outputTerminalCell = document.getElementById(this.id);
            if (outputTerminalCell) {
                outputTerminalCell.style.backgroundImage = this.isOn
                    ? `url(${outputTerminalImage2})`
                    : `url(${outputTerminalImage1})`;
                console.log(`Output terminal (${this.id}) state updated to: ${this.isOn ? 'On' : 'Off'}`);
            }
        }
    }

    function setGate(gateId) {
        selectedGate = gateButtons[gateId];
        placingInputSwitch = false;
        placingOutputTerminal = false;
    }

    Object.keys(gateButtons).forEach(gate => {
        document.getElementById(gate).addEventListener('click', () => setGate(gate));
    });

    inputSwitchButton.addEventListener('click', function () {
        placingInputSwitch = true;
        selectedGate = null;
    });

    for (let i = 0; i < 225; i++) {
        const cell = document.createElement('div');
        cell.classList.add('grid-cell');
        cell.id = `cell-${i}`;
        cell.addEventListener('click', function () {
            if (placingInputSwitch && !cell.classList.contains('has-image')) {
                placeToggleSwitch(cell);
                placingInputSwitch = false;
            } else if (placingOutputTerminal && !cell.classList.contains('has-image')) {
                placeOutputTerminal(cell);
                placingOutputTerminal = false;
            } else if (selectedGate && !cell.classList.contains('has-image')) {
                placeGate(cell, selectedGate);
                selectedGate = null;
            }
        });
        gridContainer.appendChild(cell);
    }

    document.getElementById('outputTerminalButton').addEventListener('click', function () {
        placingOutputTerminal = true;
        selectedGate = null;
    });

    function placeGate(cell, gateType) {
        let gateTypeKey;

        if (gateType === gateButtons.andGate) {
            gateTypeKey = 'and';
        } else if (gateType === gateButtons.orGate) {
            gateTypeKey = 'or';
        } else if (gateType === gateButtons.notGate) {
            gateTypeKey = 'not';
        } else if (gateType === gateButtons.nandGate) {
            gateTypeKey = 'nand';
        } else if (gateType === gateButtons.norGate) {
            gateTypeKey = 'nor';
        } else if (gateType == gateButtons.xorGate) {
            gateTypeKey = 'xor';
        }

        const gateNode = new Node(gateTypeKey, cell.id);
        graph.push(gateNode);
        cell.node = gateNode;

        
        undoStack.push({ type: 'place', cellId: cell.id, nodeId: gateNode.id });

        clearPoints(cell);
        if (gateType === gateButtons.notGate) {
            addInputPoint(cell, 'input-point1');
        } else {
            addInputPoint(cell, 'input-point1');
            addInputPoint(cell, 'input-point2');
        }
        addOutputPoint(cell);
        cell.classList.add('has-image');
        cell.style.backgroundImage = `url(${gateType})`;
        placedGates.push(cell);
        console.log(`Placed gate ${gateTypeKey} at cell ${cell.id}`);
    }

    function placeToggleSwitch(cell) {
        const toggleNode = new Node('input', cell.id);
        graph.push(toggleNode);
        cell.node = toggleNode;

        
        undoStack.push({ type: 'place', cellId: cell.id, nodeId: toggleNode.id });

        clearPoints(cell);
        cell.classList.add('has-image');
        cell.style.backgroundImage = `url(${toggleSwitchImage1})`;
        addOutputPoint(cell);

        cell.addEventListener('click', function () {
            const currentImage = cell.style.backgroundImage.includes(toggleSwitchImage1) ? toggleSwitchImage2 : toggleSwitchImage1;
            cell.style.backgroundImage = `url(${currentImage})`;

            
            const value = currentImage.includes(toggleSwitchImage2) ? 1 : 0;
            toggleNode.isOn = value === 1;

            console.log(`Toggle switch state changed to: ${currentImage.includes(toggleSwitchImage2) ? 'On' : 'Off'}`);
            
            
            toggleNode.propagate();
        });
    }

    function placeOutputTerminal(cell) {
        const outputNode = new Node('output', cell.id);
        graph.push(outputNode);
        cell.node = outputNode;

        
        undoStack.push({ type: 'place', cellId: cell.id, nodeId: outputNode.id });

        clearPoints(cell);
        cell.classList.add('has-image', 'output-terminal');
        cell.style.backgroundImage = `url(${outputTerminalImage1})`;
        addInputPoint(cell, 'input-point1');

        
        outputNode.updateOutputImage();
    }

    function addInputPoint(cell, pointClass) {
        const inputPoint = document.createElement('div');
        inputPoint.classList.add('gate-point', pointClass);
        cell.appendChild(inputPoint);
        inputPoint.dataset.value = 0;
        inputPoint.addEventListener('click', function (event) {
            event.stopPropagation();
            connectInputToOutput(cell, inputPoint);
        });
    }

    function addOutputPoint(cell) {
        const outputPoint = document.createElement('div');
        outputPoint.classList.add('gate-point', 'output-point');
        cell.appendChild(outputPoint);
        outputPoint.addEventListener('click', function (event) {
            event.stopPropagation();
            outputSelected = true;
            outputPosition = getOutputPosition(outputPoint);
            selectedOutputPoint = outputPoint;
        });
    }

    function clearPoints(cell) {
        const points = cell.querySelectorAll('.gate-point');
        points.forEach(point => point.remove());
    }

    function getOutputPosition(outputPoint) {
        const rect = outputPoint.getBoundingClientRect();
        return {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2
        };
    }

    function connectInputToOutput(cell, inputPoint) {
        if (outputSelected) {
            const sourceNode = selectedOutputPoint.parentElement.node;
            const targetNode = inputPoint.parentElement.node;

            if (sourceNode && targetNode) {
                sourceNode.addOutput(targetNode);
                targetNode.addInput(sourceNode);

                
                targetNode.evaluate();

                
                undoStack.push({
                    type: 'connect',
                    sourceNodeId: sourceNode.id,
                    targetNodeId: targetNode.id,
                });

                const inputRect = inputPoint.getBoundingClientRect();
                const inputPosition = {
                    x: inputRect.left + inputRect.width / 2,
                    y: inputRect.top + inputRect.height / 2
                };

                
                drawLine(outputPosition, inputPosition);
            }

            outputSelected = false;
        }
    }

    function drawLine(startPos, endPos) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', startPos.x);
        line.setAttribute('y1', startPos.y);
        line.setAttribute('x2', endPos.x);
        line.setAttribute('y2', endPos.y);
        line.setAttribute('stroke', 'black');
        line.setAttribute('stroke-width', '2');
        svgContainer.appendChild(line);
        drawnLines.push(line);
    }

    undoButton.addEventListener('click', function () {
        const lastAction = undoStack.pop(); 
    
        if (lastAction) {
            switch (lastAction.type) {
                case 'place':
                    
                    const lastCell = document.getElementById(lastAction.cellId);
                    if (lastCell) {
                        lastCell.classList.remove('has-image');
                        lastCell.style.backgroundImage = '';
                        clearPoints(lastCell);
                        graph = graph.filter(node => node.id !== lastAction.nodeId);
                    }
                    break;
    
                case 'connect':
                    
                    const { sourceNodeId, targetNodeId } = lastAction;
                    const sourceNode = graph.find(node => node.id === sourceNodeId);
                    const targetNode = graph.find(node => node.id === targetNodeId);
    
                    if (sourceNode && targetNode) {
                        
                        sourceNode.outputs = sourceNode.outputs.filter(output => output.id !== targetNodeId);
                        targetNode.inputs = targetNode.inputs.filter(input => input.id !== sourceNodeId);
    
                        
                        targetNode.evaluate();
    
                        
                        const lastLine = drawnLines.pop();
                        if (lastLine) {
                            lastLine.remove();
                        }
                    }
                    break;
            }
        }
    });
    const deleteButton = document.getElementById('deleteButton');
    let deletingMode = false;

    
    deleteButton.addEventListener('click', function () {
        deletingMode = !deletingMode;
        if (deletingMode) {
            deleteButton.style.backgroundColor = "red"; 
        } else {
            deleteButton.style.backgroundColor = ""; 
        }
    });

    
    gridContainer.addEventListener('click', function (event) {
        const cell = event.target.closest('.grid-cell');
    
        if (cell && deletingMode && cell.classList.contains('has-image')) {
            deleteElement(cell);
        }
    });


// ✅ NEW CIRCUIT SAVE/LOAD FLOW (with named circuits per user)

// ------ FRONTEND (script.js) ------


// 💾 Save circuit with a custom name
async function saveCircuit() {
    const email = getLoggedInEmail();
    if (!email) return alert("Not logged in.");

    const name = prompt("Name your circuit:");
    if (!name) return;

    const circuitData = [];
    const cells = document.querySelectorAll(".grid-cell");

    cells.forEach(cell => {
        if (!cell.classList.contains("has-image") || !cell.node) return;

        const gateData = {
            id: cell.id,
            type: cell.node.type,
            isOn: cell.node.isOn,
            image: cell.style.backgroundImage,
            classList: Array.from(cell.classList),
            inputs: cell.node.inputs.map(input => input.id),
            outputs: cell.node.outputs.map(output => output.id),
            points: Array.from(cell.querySelectorAll(".gate-point")).map(p => p.className),
            isSwitch: cell.node.type === 'input'
        };

        circuitData.push(gateData);
    });

    const lines = Array.from(document.querySelectorAll("line")).map(line => ({
        x1: line.getAttribute("x1"),
        y1: line.getAttribute("y1"),
        x2: line.getAttribute("x2"),
        y2: line.getAttribute("y2")
    }));

    const response = await fetch("http://localhost:3000/save-circuit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, data: { nodes: circuitData, lines } })
    });

    const result = await response.json();
    alert(result.message);
}

// 📂 Load user’s circuit list & select one
async function loadCircuit() {
    const email = getLoggedInEmail();
    if (!email) return alert("Not logged in.");

    const res = await fetch(`http://localhost:3000/load-circuits?email=${email}`);
    const { circuits } = await res.json();

    const name = prompt("Choose circuit to load:\n" + circuits.join("\n"));
    if (!name) return;

    const response = await fetch(`http://localhost:3000/load-circuit?email=${email}&name=${encodeURIComponent(name)}`);
    const result = await response.json();

    if (!result.data || !Array.isArray(result.data.nodes)) {
        alert("No circuit found.");
        return;
    }

    document.getElementById('clearButton').click();
    const { nodes, lines } = result.data;
    const idToNode = {};

    nodes.forEach(obj => {
        const cell = document.getElementById(obj.id);
        if (!cell) return;

        if (obj.type === 'input') {
            placeToggleSwitch(cell);
        } else if (obj.type === 'output') {
            placeOutputTerminal(cell);
        } else {
            placeGate(cell, gateButtons[obj.type + 'Gate']);
        }

        const newNode = graph.find(n => n.id === obj.id);
        if (newNode) {
            newNode.isOn = obj.isOn;
            idToNode[obj.id] = newNode;

            if (obj.type === 'input') {
                const currentImage = obj.isOn ? toggleSwitchImage2 : toggleSwitchImage1;
                cell.style.backgroundImage = `url(${currentImage})`;
            }
        }
    });

    nodes.forEach(obj => {
        const from = idToNode[obj.id];
        obj.outputs.forEach(outputId => {
            const to = idToNode[outputId];
            if (from && to) {
                from.addOutput(to);
                to.addInput(from);
            }
        });
    });

    lines.forEach(({ x1, y1, x2, y2 }) => {
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x1);
        line.setAttribute("y1", y1);
        line.setAttribute("x2", x2);
        line.setAttribute("y2", y2);
        line.setAttribute("stroke", "black");
        line.setAttribute("stroke-width", "2");
        svgContainer.appendChild(line);
        drawnLines.push(line);
    });

    Object.values(idToNode).forEach(n => n.evaluate());

    alert("Circuit loaded successfully!");
}

    

function deleteElement(cell) {
    if (cell.node) {
        const nodeId = cell.node.id;

        
        graph = graph.filter(node => node.id !== nodeId);

        
        graph.forEach(node => {
            node.inputs = node.inputs.filter(input => input.id !== nodeId);
            node.outputs = node.outputs.filter(output => output.id !== nodeId);
        });

        
        drawnLines = drawnLines.filter(line => {
            const x1 = parseFloat(line.getAttribute('x1'));
            const y1 = parseFloat(line.getAttribute('y1'));
            const x2 = parseFloat(line.getAttribute('x2'));
            const y2 = parseFloat(line.getAttribute('y2'));

            const cellRect = cell.getBoundingClientRect();
            const cellCenterX = cellRect.left + cellRect.width / 2;
            const cellCenterY = cellRect.top + cellRect.height / 2;

            
            if (
                Math.abs(x1 - cellCenterX) < 2 && Math.abs(y1 - cellCenterY) < 2 || 
                Math.abs(x2 - cellCenterX) < 2 && Math.abs(y2 - cellCenterY) < 2
            ) {
                svgContainer.removeChild(line);
                return false; 
            }
            return true;
        });

        
        cell.classList.remove('has-image');
        cell.style.backgroundImage = '';
        clearPoints(cell);
        cell.node = null;

       
        deletingMode = false;
        deleteButton.style.backgroundColor = "";
    }
}
    clearButton.addEventListener('click', function () {
        
        graph = [];
        placedGates.forEach(gate => {
           
            gate.classList.remove('has-image');
            gate.style.backgroundImage = '';
            clearPoints(gate); 
        });
        placedGates = []; 

        
        drawnLines.forEach(line => line.remove());
        drawnLines = []; 

        
        undoStack = [];

       
        connections = [];

        
        while (svgContainer.firstChild) {
            svgContainer.removeChild(svgContainer.firstChild);
        }

        
        const cells = gridContainer.querySelectorAll('.grid-cell');
        cells.forEach(cell => {
            cell.classList.remove('has-image');
            cell.style.backgroundImage = '';
            clearPoints(cell); 
        });
    });
});
