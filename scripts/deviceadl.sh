#!/bin/bash

NUM=1
if [ $# -ge 1 ]
  then
    NUM=$1
fi

TIMEOUT=""
if [ $# -ge 2 ]
  then
    TIMEOUT="--max-time $2"
fi

VENDORS=("AcmeMeds" "ShureCare" "VitaLife")
TYPES=("Heartrate Monitor" "Nebulizer" "Glucose Monitor")
MODELS=("Heart-Assure" "Breath-Easy" "Sure-Sugar")
SNPF=("AMHM" "SCNB" "VLGM")
INDEX=$(($NUM % 3))
SERIAL=$(($RANDOM % 1000))
PREFIX=${SNPF[$INDEX]}
SN=$(printf "%s-%05d" $PREFIX $SERIAL)
ID=`uuidgen`

DEV="{ \"UID\" : \"$ID\",\
       \"SN\" : \"$SN\",\
       \"MFG\" : \"${VENDORS[$INDEX]}\",\
       \"TYPE\" : \"${TYPES[$INDEX]}\",\
       \"MODEL\" : \"${MODELS[$INDEX]}\"\
    }"


while true
do
    echo " "
    echo "Advertising Device: $DEV"
    curl $TIMEOUT http://localhost:3000/device/advertise --header 'Content-Type: application/json' -d "$DEV"
    STATUS=$?

    echo "curl status: $STATUS"

    if [ $STATUS -eq 7 ]; then
        echo "Unable to connect"
        break
    elif [ $STATUS -ne 28 ]; then
        echo "Unexpected curl response $STATUS"
        break
    fi

done

