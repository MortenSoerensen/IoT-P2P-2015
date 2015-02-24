.PHONY: all clean run spawn render

all: spawn

output/DONT_DELETE:
	mkdir -p output
	echo "DONT_DELETE" > output/DONT_DELETE

output/Driver.js: Driver.ts Chord.ts FingerChord.ts RenderChord.ts IChord.ts utils.ts output/DONT_DELETE
	tsc Driver.ts -out output/Driver.js

clean:
	rm -rf output

run: output/Driver.js
	node output/Driver.js main_node

spawn: output/Driver.js
	node ChordSpawner.js 50

render:
	mkdir -p output
	node ChordRender.js
	dot -Tpng output/Chord.dot -o output/Chord.png
