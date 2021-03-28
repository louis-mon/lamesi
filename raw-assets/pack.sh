#! /bin/sh
OUT_DIR=$(cd ../static/assets/dungeon; pwd)
(cd dungeon && free-tex-packer-cli --project npc.ftpp --output $OUT_DIR)
(cd dungeon && free-tex-packer-cli --project menu.ftpp --output $OUT_DIR)
(cd dungeon && free-tex-packer-cli --project dragon.ftpp --output $OUT_DIR)
OUT_DIR=$(cd ../static/assets/creatures; pwd)
(cd creatures && free-tex-packer-cli --project tree.ftpp --output $OUT_DIR)
(cd creatures && free-tex-packer-cli --project central.ftpp --output $OUT_DIR)
(cd creatures && free-tex-packer-cli --project pot.ftpp --output $OUT_DIR)