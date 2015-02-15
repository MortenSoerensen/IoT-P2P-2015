.PHONY: all clean run spawn render

all: spawn

output/DONT_DELETE:
	mkdir -p output
	echo "DONT_DELETE" > output/DONT_DELETE

output/Chord.js: Chord.ts output/DONT_DELETE
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
