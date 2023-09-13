const axios = require('axios');

const EMAIL = ''; //input cloudflare domain
const API_KEY = ''; //cloudflare global api key

const targetDomains = [ //create a list of domains u want to configure
    'example.com'
];

const DKIM_SELECTOR = 'google.'; // Replace 'your_selector' with your actual DKIM selector.

// Replace the dummy DKIM keys with the actual ones for each domain
const DKIM_KEYS = {
    'example.com': 'v=DKIM1; k=rsa; p=FBCz9b5IsYKROMWx9W91oQoaFbCHLQrXnWftYccixlfChnpjIf79Aaa00ueKDGEzcEYRxma0MSNM7aa4eR+GdJgRugXM/FRqVK6JS2NPYNIucVBV5o1Xh76jMqpOyTUUiKAzGJxbPeLIwPa3vKRPfxOlqErzghALuZSCSZnCRfObyJOhHjtOJS9ZtHZHOmnbg/q+sC3EUS/SylZxaxib9DitPJxryE9hHb6Mnewln5mXLs+lovgYhjaYAJ3gB/RdRnyS9jsfX6DnISHPr2ScBiKMgpolxdtFnMqjxrrsScRaPf+Wx58SKVT3MWdYwkg4YpX9VyGiR7ZJm5Nw55wIDAQAB',
    // Add  domains and their keys as necessary format is 'domain': 'dkimKey'
};

async function fetchZones(page = 1) {
  const options = {
    method: 'GET',
    url: `https://api.cloudflare.com/client/v4/zones?page=${page}&per_page=50`, 
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Email': EMAIL,
      'X-Auth-Key': API_KEY
    }
  };
  const response = await axios.request(options);
  return response.data;
}

async function addDnsRecord(zoneId, type, name, content) {
  const options = {
    method: 'POST',
    url: `https://api.cloudflare.com/client/v4/zones/${zoneId}/dns_records`,
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Email': EMAIL,
      'X-Auth-Key': API_KEY
    },
    data: {
      type,
      name,
      content,
      ttl: 120 // You can adjust the TTL as needed
    }
  };
  const response = await axios.request(options);
  return response.data;
}

async function configureDnsForDomains() {
  let page = 1;
  let zones = [];

  while (true) {
    const data = await fetchZones(page);
    if (data && data.result.length) {
      zones = zones.concat(data.result);
      if (data.result_info.page >= data.result_info.total_pages) {
        break;
      }
      page++;
    } else {
      break;
    }
  }

  for (const zone of zones) {
    if (targetDomains.includes(zone.name)) {
      console.log(`Configuring DNS for ${zone.name}...`);

      // Add SPF record
      await addDnsRecord(zone.id, 'TXT', '@', 'v=spf1 include:_spf.google.com ~all');

      // Add DMARC record
      await addDnsRecord(zone.id, 'TXT', `_dmarc.${zone.name}`, `v=DMARC1; p=reject; rua=mailto:dmarc@${zone.name}`);

      // Add DKIM record
      if (DKIM_KEYS[zone.name]) {
        await addDnsRecord(zone.id, 'TXT', `${DKIM_SELECTOR}._domainkey`, DKIM_KEYS[zone.name]);
      }

      console.log(`Configured DNS for ${zone.name}`);
    }
  }
}

configureDnsForDomains();
