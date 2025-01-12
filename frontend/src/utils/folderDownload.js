import JSZip from 'jszip';

export function selectedEntitiesDownload(selected_entities) {
  const generateRandomString = () => [...Array(5)].map(() => Math.random().toString(36)[2]).join('');
  const randomString = generateRandomString();
  const folderName = "FDrive_" + randomString;

  const zip = new JSZip();

  const processEntity = (entity, parentFolder) => {
    console.log(entity.title);
    if (entity.is_group) {
      const folder = parentFolder.folder(entity.title);
      return get_children(entity.name)
        .then((children) => {
          const promises = children.map((childEntity) => processEntity(childEntity, folder));
          return Promise.all(promises);
        });
    } else {
      return get_file_content(entity.name)
        .then((fileContent) => {
          parentFolder.file(entity.title, fileContent);
        });
    }
  };

  const promises = selected_entities.map((entity) => processEntity(entity, zip));

  Promise.all(promises)
    .then(() => {
      return zip.generateAsync({ type: 'blob', streamFiles: true });
    })
    .then(function (content) {
      var downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(content);
      downloadLink.download = folderName + '.zip';

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    })
    .catch((error) => {
      console.error(error);
    });
}

export function folderDownload(root_entity) {
  const folderName = root_entity.title;
  const zip = new JSZip();

  temp(root_entity.name, zip)
    .then(() => {
      return zip.generateAsync({ type: 'blob', streamFiles: true });
    })
    .then((content) => {
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(content);
      downloadLink.download = folderName + '.zip';

      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    })
    .catch((error) => {
      console.error(error);
    });
}

function temp(entity_name, parentZip) {
  return new Promise((resolve, reject) => {
    get_children(entity_name)
      .then((result) => {
        const promises = result.map((entity) => {
          if (entity.is_group) {
            const folder = parentZip.folder(entity.title);
            return temp(entity.name, folder);
          } else {
            return get_file_content(entity.name)
              .then((fileContent) => {
                parentZip.file(entity.title, fileContent);
              });
          }
        });

        Promise.all(promises)
          .then(() => {
            resolve();
          })
          .catch((error) => {
            reject(error);
          });
      })
      .catch((error) => {
        reject(error);
      });
  });
}

function get_file_content(entity_name) {
  const fileUrl = "/api/method/" + `drive.api.files.get_file_content?entity_name=${entity_name}`;

  return fetch(fileUrl)
    .then(response => {
      if (response.ok) {
        return response.blob();
      } else {
        throw new Error(`Request failed with status ${response.status}`);
      }
    });
}


function get_children(entity_name) {
  return new Promise((resolve, reject) => {
    const url = "/api/method/" + `drive.api.nested_folder.folder_contents?entity_name=${entity_name}`;

    const xhr = new XMLHttpRequest();
    xhr.open("GET", url);
    xhr.onload = function () {
      if (xhr.status === 200) {
        const json = JSON.parse(xhr.responseText);
        resolve(json.message);
      } else {
        reject(new Error(`Request failed with status ${xhr.status}`));
      }
    };
    xhr.send();
  });
}
