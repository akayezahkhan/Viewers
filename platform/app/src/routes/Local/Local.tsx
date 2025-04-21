import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DicomMetadataStore, MODULE_TYPES, useSystem } from '@ohif/core';

import Dropzone from 'react-dropzone';
import filesToStudies from './filesToStudies';

import { extensionManager } from '../../App';

import { Button, Icons } from '@ohif/ui-next';

type LocalProps = {
  modePath: string;
};

function Local({ modePath }: LocalProps) {
  const [fileNames, setFileNames] = useState<string[]>([]);
  const isManifestLoaded = fileNames.length > 0;

  const getLoadButton = (onDrop, text) => {
    return (
      <Dropzone
        onDrop={onDrop}
        noDrag
      >
        {({ getRootProps, getInputProps }) => (
          <div {...getRootProps()}>
            <Button
              variant="default"
              className="w-28"
              disabled={false}
              onClick={() => {
                if (isManifestLoaded) {
                  onDrop();
                }
              }}
            >
              {text}
            </Button>
          </div>
        )}
      </Dropzone>
    );
  };

  const { servicesManager } = useSystem();
  const { customizationService } = servicesManager.services;
  const navigate = useNavigate();
  const dropzoneRef = useRef();
  const [dropInitiated, setDropInitiated] = React.useState(false);

  const LoadingIndicatorProgress = customizationService.getCustomization(
    'ui.loadingIndicatorProgress'
  );
  useEffect(() => {
    fetch('/dicom_files.json')
      .then(response => response.json())
      .then(data => {
        setFileNames(data); // update state
        console.log('Loaded fileNames:', data);
      })
      .catch(error => console.error('Error loading JSON:', error));
  }, []);

  // Initializing the dicom local dataSource
  const dataSourceModules = extensionManager.modules[MODULE_TYPES.DATA_SOURCE];
  const localDataSources = dataSourceModules.reduce((acc, curr) => {
    const mods = [];
    curr.module.forEach(mod => {
      if (mod.type === 'localApi') {
        mods.push(mod);
      }
    });
    return acc.concat(mods);
  }, []);

  const firstLocalDataSource = localDataSources[0];
  const dataSource = firstLocalDataSource.createDataSource({});

  const microscopyExtensionLoaded = extensionManager.registeredExtensionIds.includes(
    '@ohif/extension-dicom-microscopy'
  );

  // const fileNames = [
  //   '1.2.826.0.1.3680043.8.498.4275877852413620706087033949776426147.dcm',
  //   '1.2.826.0.1.3680043.8.498.6790281529531735214439939164103595673.dcm',
  //   '1.2.826.0.1.3680043.8.498.14012196709335913320460390623121005339.dcm',
  // ];

  // let fileNames = [];
  // fetch('/public/dicoms/manifest.json')
  //   .then(response => response.json())
  //   .then(data => {
  //     fileNames = data; // data is your array from the JSON file
  //     console.log(fileNames);
  //   })
  //   .catch(error => console.error('Error loading JSON:', error));

  const loadDicomFiles = async () => {
    if (!fileNames.length) {
      console.error('File names not loaded yet');
      return [];
    }

    const filePromises = fileNames.map(async fileName => {
      const response = await fetch(
        /dicoms/Study_1.2.826.0.1.3680043.8.498.78610350547668740347851208464231767134/${fileName}
      );
      const blob = await response.blob();
      return new File([blob], fileName, { type: 'application/dicom' });
    });

    const fileArray = await Promise.all(filePromises);
    return fileArray;
  };

  const onDrop = async () => {
    const fileArray = await loadDicomFiles();
    console.log('fileArray');
    console.log(fileArray);
    // onDrop(fileArray); // Use your existing function

    const studies = await filesToStudies(fileArray, dataSource);
    // const studies = await filesToStudies(acceptedFiles, dataSource);
    // console.log('acceptedFiles');
    // console.log(acceptedFiles);
    console.log('studies');
    console.log(studies);

    const query = new URLSearchParams();

    if (microscopyExtensionLoaded) {
      // TODO: for microscopy, we are forcing microscopy mode, which is not ideal.
      //     we should make the local drag and drop navigate to the worklist and
      //     there user can select microscopy mode
      const smStudies = studies.filter(id => {
        const study = DicomMetadataStore.getStudy(id);
        return (
          study.series.findIndex(s => s.Modality === 'SM' || s.instances[0].Modality === 'SM') >= 0
        );
      });

      if (smStudies.length > 0) {
        smStudies.forEach(id => query.append('StudyInstanceUIDs', id));

        modePath = 'microscopy';
      }
    }

    // Todo: navigate to work list and let user select a mode
    studies.forEach(id => query.append('StudyInstanceUIDs', id));
    query.append('datasources', 'dicomlocal');

    navigate(/${modePath}?${decodeURIComponent(query.toString())});
  };

  // Set body style
  useEffect(() => {
    document.body.classList.add('bg-black');
    return () => {
      document.body.classList.remove('bg-black');
    };
  }, []);

  return (
    <Dropzone
      ref={dropzoneRef}
      onDrop={acceptedFiles => {
        setDropInitiated(true);
        onDrop(acceptedFiles);
      }}
      noClick
    >
      {({ getRootProps }) => (
        <div
          {...getRootProps()}
          style={{ width: '100%', height: '100%' }}
        >
          <div className="flex h-screen w-screen items-center justify-center">
            <div className="bg-muted border-primary/60 mx-auto space-y-2 rounded-xl border border-dashed py-12 px-12 drop-shadow-md">
              <div className="flex items-center justify-center">
                <Icons.OHIFLogoColorDarkBackground className="h-18" />
              </div>
              <div className="space-y-2 py-6 text-center">
                {dropInitiated ? (
                  <div className="flex flex-col items-center justify-center pt-12">
                    <LoadingIndicatorProgress className={'h-full w-full bg-black'} />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-primary pt-0 text-xl">Click the Open button to view.</p>
                    <p className="text-muted-foreground text-base">
                      Note: Your data remains locally within your browser
                      <br /> and is never uploaded to any server.
                    </p>
                    <p>Welcome abcd</p>

                    <input
                      type="text"
                      placeholder="write here"
                    ></input>
                  </div>
                )}
              </div>
              <div className="flex justify-center gap-2 pt-4">
                {/* {getLoadButton(onDrop, 'Load files', false)} */}
                {getLoadButton(onDrop, 'Open', true)}
              </div>
            </div>
          </div>
        </div>
      )}
    </Dropzone>
  );
}

export default Local;
