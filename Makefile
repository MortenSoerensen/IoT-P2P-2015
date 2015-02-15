.PHONY: all clean run spawn render

all: spawn

output/Chord.js: Chord.ts
	mkdir -p output
	tsc Chord.ts -out output/Chord.js

clean:
	rm -rf output

run: output/Chord.js
	node output/Chord.js main_node

spawn: output/Chord.js
	node ChordSpawner.js 50

render:
	mkdir -p output
	node ChordRender.js
	dot -Tpng output/Chord.dot -o output/Chord.png
