.PHONY: all clean run render

all: run

clean:
	rm -rf output

run:
	node Chord.js main_node

render:
	mkdir -p output
	node ChordRender.js
	dot -Tpng output/Chord.dot -o output/Chord.png
