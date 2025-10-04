import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: __ENV.K6_VUS ? parseInt(__ENV.K6_VUS) : 10,
  duration: __ENV.K6_DURATION || '1m',
};

const imgPath = __ENV.IMAGE_PATH || './test-image.jpg';
const image = open(imgPath, 'b');

export default function () {
  let res = http.post('http://localhost:3000/upload', { image: http.file(image, 'test.jpg') }, { tags: { name: 'upload' } });
  check(res, { 'upload ok': (r) => r.status === 201 || r.status === 200 });

  const getRes = http.get('http://localhost:3000/image/test.jpg', { tags: { name: 'get' } });
  check(getRes, { 'get ok': (r) => r.status === 200 });

  sleep(0.5);
}
