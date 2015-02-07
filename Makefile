.PHONY: all clean run spawn render

all: spawn

clean:
	rm -rf output

run:
	node Chord.js main_node

spawn:
	node ChordSpawner.js 50

render:
	mkdir -p output
	node ChordRender.js
	dot -Tpng output/Chord.dot -o output/Chord.png
