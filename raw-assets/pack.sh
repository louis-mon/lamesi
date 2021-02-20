#! /bin/sh
OUT_DIR=$(cd ../static/assets/dungeon; pwd)
(cd dungeon && free-tex-packer-cli --project npc.ftpp --output $OUT_DIR)
(cd dungeon && free-tex-packer-cli --project menu.ftpp --output $OUT_DIR)
(cd dungeon && free-tex-packer-cli --project dragon.ftpp --output $OUT_DIR)
