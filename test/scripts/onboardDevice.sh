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
MACS=("4C:32:75:90:33:B3","08:00:69:02:01:FC","B8:27:EB:BC:23:E5")
SNPF=("AMHM" "SCNB" "VLGM")
INDEX=$(($NUM % 3))
SERIAL=$(($RANDOM % 1000))
PREFIX=${SNPF[$INDEX]}
SN=$(printf "%s-%05d" $PREFIX $SERIAL)

REGSERVER_URL="http://localhost:3000"

#ID=`uuidgen`
# Use static UIDs for testing
UIDS=("9C5DBA55-48E7-449F-ABD0-B449FFF5EF90" "584BB997-3193-4CD0-BD42-4E9359A58E81" "0889E1BF-B210-49BC-BABD-7E069407B196")
ID=${UIDS[$INDEX]}

DEV="{ \"UID\" : \"$ID\",\
       \"SN\" : \"$SN\",\
       \"MFG\" : \"${VENDORS[$INDEX]}\",\
       \"TYPE\" : \"${TYPES[$INDEX]}\",\
       \"MAC\" : \"${MACS[$INDEX]}\",\
       \"MODEL\" : \"${MODELS[$INDEX]}\"\
    }"

# { "csrTemplate": { "keyType": "RSA:2048" }, "token": "OWKIC" }
request_cert() {

  #################################################
  # Generate CSR
  #################################################

  # Save csrt response
  echo "$1" > "../client/csrt.json"

  # CA directory
  pushd ../ca > /dev/null

  # Extract encryption type (typically rsa:2048)
  type=`jq -r '.csrTemplate.keyType' ../client/csrt.json`

  # Extract token 
  token=`jq -r '.token' ../client/csrt.json`

  # Generate CSR
  openssl req -newkey "$type" -key ../client/clientkey -out ../client/client.csr -config request_csr.cnf

  # Display CSR
  cat ../client/client.csr

  popd > /dev/null

  #################################################
  # Submit CSR
  #################################################
  
  declare -a HEADERS=('-H' "content-type: application/json" '-H' "authorization: $token")

  # Read in CSR. We need to use base64 to preserve line endings.
  CSR=`cat ../client/client.csr | base64`

  # Create JSON wrapper
  mkdir -p ../tmp
  echo "{" > ../tmp/csr.json
  echo "  \"UID\": \"$ID\"," >> ../tmp/csr.json
  echo "  \"csr\": \"$CSR\"" >> ../tmp/csr.json
  echo "}" >> ../tmp/csr.json

  # Submit the CSR
  curl -d @../tmp/csr.json "$REGSERVER_URL"/device/cert "${HEADERS[@]}" > ../tmp/certs.json

  # Parse Reply
  jq -r '.subscriber' ../tmp/certs.json > ../client/subscriber.json
  jq -r '.caCert' ../tmp/certs.json | base64 -D > ../client/caCert.pem
  jq -r '.wifiCert' ../tmp/certs.json | base64 -D > ../client/wifiCert.crt

  echo "Certificates Received."
  echo "Subscriber:"
  cat ../client/subscriber.json
  echo "CA Cert:"
  cat ../client/caCert.pem
  echo "Wifi Cert:"
  cat ../client/wifiCert.crt

  #################################################
  # Notify Certs Installed
  #################################################

  echo "{" > ../tmp/complete.json
  echo "  \"UID\": \"$ID\"" >> ../tmp/complete.json
  echo "}" >> ../tmp/complete.json
  curl -d @../tmp/complete.json http://"$REGSERVER_URL"/device/pair-complete "${HEADERS[@]}"
}


while true
do
    echo " "
    echo "Advertising Device: $DEV"
    RESPONSE=$(curl $TIMEOUT "$REGSERVER_URL"/device/advertise --header 'Content-Type: application/json' -d "$DEV")
    STATUS=$?

    echo "curl status: $STATUS"

    if [ $STATUS -eq 7 ]; then
        echo "Unable to connect"
        break
    elif [ $STATUS -eq 52 ]; then
        echo "Empty response - retrying..."
    elif [ $STATUS -eq 0 ]; then
        echo "Received response $STATUS from server:"
        echo $RESPONSE
        request_cert "$RESPONSE"
        break
    elif [ $STATUS -ne 28 ]; then
        echo "Unexpected curl response $STATUS"
        break
    fi

done

