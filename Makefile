.PHONY: all clean run spawn render build conf_res

all: spawn

output/DONT_DELETE:
	mkdir -p output
	echo "DONT_DELETE" > output/DONT_DELETE

database/DONT_DELETE:
	mkdir -p database
	echo "DONT_DELETE" > database/DONT_DELETE

output/ResourceConfigurator.js: ResourceConfigurator.ts utils.ts
	tsc ResourceConfigurator.ts -out output/ResourceConfigurator.js

output/Driver.js: Driver.ts Chord.ts ResourceChord.ts FingerChord.ts RenderChord.ts IChord.ts utils.ts ChordHelper.ts output/ResourceConfigurator.js output/DONT_DELETE database/DONT_DELETE
	tsc Driver.ts -out output/Driver.js

build: output/Driver.js

clean:
	rm -rf output

run: output/Driver.js
	node ChordSpawner.js 1

spawn: output/Driver.js
	node ChordSpawner.js 10

render:
	mkdir -p output
	node ChordRender.js
	circo output/Chord.dot > output/Chord_circo.dot
	sed -e '/}/ {' -e 'r output/Finger_edges.dot_frag' -e 'd' -e '}' output/Chord_circo.dot > output/Chord_finger.dot
	neato -n output/Chord_circo.dot -Tpng -O
	neato -n output/Chord_finger.dot -Tpng -O
