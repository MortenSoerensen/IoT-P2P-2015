.PHONY: all clean run spawn render build

all: spawn

output/DONT_DELETE:
	mkdir -p output
	echo "DONT_DELETE" > output/DONT_DELETE

output/Driver.js: Driver.ts Chord.ts FingerChord.ts RenderChord.ts IChord.ts utils.ts output/DONT_DELETE
	tsc Driver.ts -out output/Driver.js

build: output/Driver.js

clean:
	rm -rf output

run: output/Driver.js
	node output/Driver.js main_node

spawn: output/Driver.js
	node ChordSpawner.js 50

render:
	mkdir -p output
	node ChordRender.js
	circo output/Chord.dot > output/Chord_circo.dot
	sed -e '/}/ {' -e 'r output/Finger_edges.dot_frag' -e 'd' -e '}' output/Chord_circo.dot > output/Chord_finger.dot
	neato -n output/Chord_circo.dot -Tpng -O
	neato -n output/Chord_finger.dot -Tpng -O
